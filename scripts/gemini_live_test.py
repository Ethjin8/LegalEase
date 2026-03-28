"""
Gemini Live API playground — voice conversation

Usage:
    python scripts/gemini_live_test.py          # mic + speaker (default)
    python scripts/gemini_live_test.py --text    # text-in, audio saved to file

Requires: google-genai, pyaudio
Use headphones to prevent echo feedback.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

import pyaudio

from google import genai
from google.genai import types

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Missing GEMINI_API_KEY env var", file=sys.stderr)
    sys.exit(1)

MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"
OUTPUT_DIR = Path(__file__).parent / "gemini-output"
OUTPUT_DIR.mkdir(exist_ok=True)

SEND_RATE = 16000
RECV_RATE = 24000
CHUNK = 1024
FORMAT = pyaudio.paInt16

client = genai.Client(
    api_key=API_KEY,
    http_options={"api_version": "v1beta"},
)

CONFIG = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Zephyr")
        )
    ),
    tools=[types.Tool(google_search=types.GoogleSearch())],
)

pya = pyaudio.PyAudio()


async def run_voice() -> None:
    """Full duplex voice: mic in, speaker out."""
    audio_in_queue: asyncio.Queue[bytes] = asyncio.Queue()
    audio_out_queue: asyncio.Queue[dict[str, str | bytes]] = asyncio.Queue(maxsize=5)

    print(f"Connecting to Gemini Live ({MODEL})...")
    print("Use headphones! Press Ctrl+C to quit.\n")

    async with client.aio.live.connect(model=MODEL, config=CONFIG) as session:
        print("Connected — speak!\n")

        async def listen_mic() -> None:
            mic_info = pya.get_default_input_device_info()
            stream = await asyncio.to_thread(
                pya.open,
                format=FORMAT,
                channels=1,
                rate=SEND_RATE,
                input=True,
                input_device_index=mic_info["index"],
                frames_per_buffer=CHUNK,
            )
            try:
                while True:
                    data = await asyncio.to_thread(
                        stream.read, CHUNK, exception_on_overflow=False
                    )
                    payload = {"data": data, "mime_type": "audio/pcm"}
                    try:
                        audio_out_queue.put_nowait(payload)
                    except asyncio.QueueFull:
                        audio_out_queue.get_nowait()
                        audio_out_queue.put_nowait(payload)
            except asyncio.CancelledError:
                pass
            finally:
                stream.stop_stream()
                stream.close()

        async def send_audio() -> None:
            try:
                while True:
                    msg = await audio_out_queue.get()
                    await session.send_realtime_input(audio=msg)
            except asyncio.CancelledError:
                pass

        async def receive_audio() -> None:
            try:
                while True:
                    async for response in session.receive():
                        if data := response.data:
                            audio_in_queue.put_nowait(data)
                        if text := response.text:
                            print(text, end="", flush=True)
                    # On turn complete, flush queued audio to handle interruptions
                    while not audio_in_queue.empty():
                        audio_in_queue.get_nowait()
            except asyncio.CancelledError:
                pass

        async def play_speaker() -> None:
            stream = await asyncio.to_thread(
                pya.open,
                format=FORMAT,
                channels=1,
                rate=RECV_RATE,
                output=True,
            )
            try:
                while True:
                    data = await audio_in_queue.get()
                    await asyncio.to_thread(stream.write, data)
            except asyncio.CancelledError:
                pass
            finally:
                stream.stop_stream()
                stream.close()

        async def wait_quit() -> None:
            await asyncio.to_thread(input, "Press Enter to quit...\n")

        try:
            async with asyncio.TaskGroup() as tg:
                quit_task = tg.create_task(wait_quit())
                tg.create_task(listen_mic())
                tg.create_task(send_audio())
                tg.create_task(receive_audio())
                tg.create_task(play_speaker())
                await quit_task
                raise asyncio.CancelledError("quit")
        except asyncio.CancelledError:
            pass

    print("Session closed.")


async def run_text() -> None:
    """Text-in, audio response saved to file."""
    turn_count = 0

    print(f"Connecting to Gemini Live ({MODEL})...\n")

    async with client.aio.live.connect(model=MODEL, config=CONFIG) as session:
        print("Connected! Type a message and press Enter. 'q' to quit.\n")

        while True:
            try:
                line = await asyncio.to_thread(input, "> ")
            except (EOFError, KeyboardInterrupt):
                print("\nBye!")
                break

            msg = line.strip()
            if not msg:
                continue
            if msg.lower() == "q":
                print("Bye!")
                break

            await session.send_client_content(
                turns=types.Content(parts=[types.Part(text=msg)]),
                turn_complete=True,
            )

            audio_chunks: list[bytes] = []
            async for response in session.receive():
                if data := response.data:
                    audio_chunks.append(data)
                if text := response.text:
                    print(text, end="", flush=True)
                if response.server_content and response.server_content.turn_complete:
                    break

            turn_count += 1
            if audio_chunks:
                f = OUTPUT_DIR / f"response_{turn_count}.pcm"
                f.write_bytes(b"".join(audio_chunks))
                print(f"\n[Audio saved: {f}]")
                print(f'[Play: ffplay -f s16le -ar 24000 -ch_layout mono "{f}"]')
            print()

    print("Session closed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gemini Live API playground")
    parser.add_argument("--text", action="store_true", help="Text mode (no mic)")
    args = parser.parse_args()

    asyncio.run(run_text() if args.text else run_voice())
