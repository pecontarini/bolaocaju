import { createFileRoute } from "@tanstack/react-router";
import { LayoutCliente } from "@/components/site/LayoutCliente";

export const Route = createFileRoute("/palpitar")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <LayoutCliente>
      <div className="text-center py-10">
        <p className="font-display text-2xl text-cl-verde-escuro">Em breve</p>
        <p className="text-sm text-cl-cinza-texto mt-2">
          Esta tela está sendo preparada.
        </p>
      </div>
    </LayoutCliente>
  );
}
