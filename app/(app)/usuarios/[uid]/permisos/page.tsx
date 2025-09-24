import PermisosUsuario from "@/components/admin/PermisosUsuario";

export default async function Page({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Permisos del usuario</h1>
      <PermisosUsuario uid={uid} />
    </main>
  );
}
