import { DeploymentPanel } from "@/components/deployment-panel";

export default function SystemPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">Sistema</p>
      <h1 className="mt-2 text-3xl font-black text-zinc-950">Despliegue de Ivoolve Agent</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
        Ejecuta el despliegue de este proyecto directamente desde el dashboard.
      </p>
      <div className="mt-7">
        <DeploymentPanel />
      </div>
    </div>
  );
}
