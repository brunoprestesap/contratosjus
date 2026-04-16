import { Header } from "@/components/layout/header";
import { ContratoForm } from "@/components/contratos/contrato-form";

export const metadata = {
  title: "Novo Contrato | JFAP Contratos",
};

export default function NovoContratoPage() {
  return (
    <>
      <Header title="Novo Contrato" />
      <div className="p-6">
        <ContratoForm />
      </div>
    </>
  );
}
