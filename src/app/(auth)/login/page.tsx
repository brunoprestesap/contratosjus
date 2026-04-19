import { Scale, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

const CURRENT_YEAR = new Date().getFullYear();

const asideBackgroundStyle = {
  backgroundImage:
    "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 45%)",
};

const featureList = (
  <ul className="space-y-3 pt-2 text-sm text-white/85">
    <li className="flex items-center gap-3">
      <span className="flex size-7 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
        <ShieldCheck className="size-3.5" />
      </span>
      Acesso restrito a fiscais e diretores autorizados
    </li>
    <li className="flex items-center gap-3">
      <span className="flex size-7 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
        <ShieldCheck className="size-3.5" />
      </span>
      Trilha de auditoria e conformidade LGPD
    </li>
    <li className="flex items-center gap-3">
      <span className="flex size-7 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
        <ShieldCheck className="size-3.5" />
      </span>
      Cálculo automático de saldo contratual
    </li>
  </ul>
);

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel institucional (desktop) */}
      <aside className="relative hidden overflow-hidden bg-brand text-brand-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={asideBackgroundStyle}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-transparent via-transparent to-black/30"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
            <Scale className="size-6" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight">ContratosJUS</p>
            <p className="text-xs text-white/70">JFAP · NUTEC</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Gestão e controle de desembolso de contratos
          </h2>
          <p className="text-sm leading-relaxed text-white/80">
            Plataforma interna da Justiça Federal do Amapá para acompanhamento de empenhos,
            pagamentos e aditivos conforme as Leis 14.133/2021 e 8.666/1993.
          </p>
          {featureList}
        </div>

        <p className="relative z-10 text-xs text-white/60">
          © {CURRENT_YEAR} Justiça Federal do Amapá — NUTEC
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <Scale className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">ContratosJUS</p>
              <p className="text-xs text-muted-foreground">JFAP · NUTEC</p>
            </div>
          </div>

          <div className="mb-8 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta institucional para continuar.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Conexão segura · Sessão expira após 30min de inatividade
          </p>
        </div>
      </main>
    </div>
  );
}
