import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
