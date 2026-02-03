import dynamic from "next/dynamic";

const DocumentEditor = dynamic(() => import("@/components/DocumentEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen px-6 py-12 text-sm text-[color:var(--muted)]">
      Loading editor...
    </div>
  ),
});

export default function DocumentPage() {
  return <DocumentEditor />;
}
