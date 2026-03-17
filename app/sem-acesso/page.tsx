import { UserButton } from "@clerk/nextjs";
import { ShieldOff } from "lucide-react";

export default function SemAcessoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldOff className="w-7 h-7 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Aguardando liberação</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Sua conta foi criada com sucesso. Um administrador precisa atribuir seu cargo para você acessar o sistema.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <UserButton signInUrl="/sign-in" />
          <span className="text-sm text-gray-400">Fazer logout</span>
        </div>
      </div>
    </div>
  );
}
