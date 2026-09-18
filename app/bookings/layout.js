import SessionGate from "../../components/layout/SessionGate";

export default function ProtectedLayout({ children }) {
  return <SessionGate>{children}</SessionGate>;
}
