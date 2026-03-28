import Sidebar from "@/components/Sidebar";
import TransitionReveal from "@/components/TransitionReveal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      <TransitionReveal />
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
