// "use client";

// import { useState } from "react";
// import { Plus, X, Loader2, BookOpen } from "lucide-react";
// import { useRouter } from "next/navigation";
// import {
//   ATIVIDADE_LABEL, ATIVIDADES_PREVENTIVAS, ATIVIDADES_CORRETIVAS,
//   PRAZO_HORAS, ATIVIDADE_REFERENCIA_MANUAL, SUBSISTEMAS, prazoFormatado,
// } from "@/lib/sla-manual";
// import { addHours } from "date-fns";

// const PRIORIDADES = ["CRITICA", "ALTA", "MEDIA", "BAIXA"] as const;
// const PRIORIDADE_LABEL: Record<string, string> = {
//   CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa",
// };

// const inp = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition";

// interface Tecnico {
//   id: string;
//   nome: string;
//   cargo: string;
// }

// export function NovaOSModal({ onClose, tecnicos = [] }: { onClose: () => void; tecnicos?: Tecnico[] }) {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [erro, setErro] = useState<string | null>(null);
//   const [tipoAtividade, setTipoAtividade] = useState("");
//   const [dataEmissao, setDataEmissao] = useState("");

//   const prazoHoras = tipoAtividade ? PRAZO_HORAS[tipoAtividade] : null;
//   const dataLimitePreview = dataEmissao && prazoHoras
//     ? addHours(new Date(dataEmissao), prazoHoras)
//     : null;

//   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
//     e.preventDefault();
//     setLoading(true);
//     setErro(null);

//     const form = new FormData(e.currentTarget);
//     const body = {
//       titulo:          form.get("titulo"),
//       descricao:       form.get("descricao"),
//       motivoOS:        form.get("motivoOS"),
//       tipoAtividade:   form.get("tipoAtividade"),
//       prioridade:      form.get("prioridade"),
//       dataEmissaoAxia: new Date(form.get("dataEmissaoAxia") as string).toISOString(),
//       dataProgramada:  form.get("dataProgramada")
//         ? new Date(form.get("dataProgramada") as string).toISOString()
//         : undefined,
//       subsistema:    form.get("subsistema"),
//       componenteTag: form.get("componenteTag") || undefined,
//       containerId:   form.get("containerId") || undefined,
//       responsavelId: form.get("responsavelId") || undefined,
//     };

//     const res = await fetch("/api/os", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       setErro(data.error?.formErrors?.[0] ?? "Erro ao criar OS. Verifique os campos.");
//       setLoading(false);
//       return;
//     }

//     router.refresh();
//     router.push(`/ordens/${data.os.id}`);
//     onClose();
//   }

//   return (
//     <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//         <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100">
//           <div>
//             <h2 className="text-lg font-semibold text-gray-900">Nova Ordem de Serviço</h2>
//             <p className="text-sm text-gray-500 mt-0.5">
//               Prazo SLA definido pelo tipo de atividade — Manual ANTSPACE HK3 V6
//             </p>
//           </div>
//           <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
//             <X className="w-4 h-4" />
//           </button>
//         </div>

//         <form onSubmit={handleSubmit} className="p-6 space-y-5">
//           {/* Título */}
//           <div>
//             <label className="text-xs font-medium text-gray-600 mb-1.5 block">
//               Título <span className="text-red-500">*</span>
//             </label>
//             <input name="titulo" required minLength={5} className={inp}
//               placeholder="Ex: Lubrificação rolamentos bomba circulação P01" />
//           </div>

//           {/* Tipo de atividade */}
//           <div>
//             <label className="text-xs font-medium text-gray-600 mb-1.5 block">
//               Tipo de atividade <span className="text-red-500">*</span>
//               <span className="text-gray-400 font-normal ml-1">(define o prazo SLA)</span>
//             </label>
//             <select name="tipoAtividade" required className={inp}
//               value={tipoAtividade} onChange={(e) => setTipoAtividade(e.target.value)}>
//               <option value="">Selecionar atividade...</option>
//               <optgroup label="── Preventiva / Programada ──">
//                 {ATIVIDADES_PREVENTIVAS.map((a) => (
//                   <option key={a} value={a}>{ATIVIDADE_LABEL[a]} ({prazoFormatado(PRAZO_HORAS[a])})</option>
//                 ))}
//               </optgroup>
//               <optgroup label="── Corretiva / Emergencial ──">
//                 {ATIVIDADES_CORRETIVAS.map((a) => (
//                   <option key={a} value={a}>{ATIVIDADE_LABEL[a]} ({prazoFormatado(PRAZO_HORAS[a])})</option>
//                 ))}
//               </optgroup>
//             </select>
//             {tipoAtividade && (
//               <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 rounded-lg px-3 py-1.5 mt-1.5">
//                 <BookOpen className="w-3.5 h-3.5 shrink-0" />
//                 {ATIVIDADE_REFERENCIA_MANUAL[tipoAtividade]}
//                 {prazoHoras && <span className="ml-auto font-medium">{prazoFormatado(prazoHoras)}</span>}
//               </div>
//             )}
//           </div>

//           {/* Prioridade + Container */}
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="text-xs font-medium text-gray-600 mb-1.5 block">
//                 Prioridade <span className="text-red-500">*</span>
//               </label>
//               <select name="prioridade" required defaultValue="MEDIA" className={inp}>
//                 {PRIORIDADES.map((p) => (
//                   <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-600 mb-1.5 block">Container ID</label>
//               <input name="containerId" placeholder="Ex: HK3-01" className={inp} />
//             </div>
//           </div>

//           {/* Subsistema + TAG */}
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="text-xs font-medium text-gray-600 mb-1.5 block">
//                 Subsistema <span className="text-red-500">*</span>
//               </label>
//               <select name="subsistema" required className={inp}>
//                 <option value="">Selecionar...</option>
//                 {SUBSISTEMAS.map((s) => <option key={s} value={s}>{s}</option>)}
//               </select>
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-600 mb-1.5 block">TAG do componente</label>
//               <input name="componenteTag" placeholder="Ex: P01, G04, V202" className={inp} />
//             </div>
//           </div>

//           {/* ✅ Responsável */}
//           {tecnicos.length > 0 && (
//             <div>
//               <label className="text-xs font-medium text-gray-600 mb-1.5 block">
//                 Técnico responsável
//               </label>
//               <select name="responsavelId" className={inp}>
//                 <option value="">Sem responsável definido</option>
//                 {tecnicos.map((t) => (
//                   <option key={t.id} value={t.id}>
//                     {t.nome} ({t.cargo.charAt(0) + t.cargo.slice(1).toLowerCase()})
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           {/* Data emissão Axia */}
//           <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-2">
//             <label className="text-xs font-semibold text-violet-700 block">
//               Data e hora de emissão da OS — Axia (CONTRATANTE) <span className="text-red-500">*</span>
//             </label>
//             <p className="text-xs text-violet-500">
//               Início do prazo SLA. O deadline é calculado automaticamente conforme o tipo de atividade.
//             </p>
//             <input type="datetime-local" name="dataEmissaoAxia" required className={inp}
//               value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
//             {dataLimitePreview && (
//               <div className="flex justify-between text-xs bg-white/80 rounded-lg px-3 py-1.5">
//                 <span className="text-gray-500">Prazo limite:</span>
//                 <span className="font-semibold text-violet-700">
//                   {dataLimitePreview.toLocaleDateString("pt-BR")} às{" "}
//                   {dataLimitePreview.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
//                 </span>
//               </div>
//             )}
//           </div>

//           {/* Data programada */}
//           <div>
//             <label className="text-xs font-medium text-gray-600 mb-1.5 block">Data programada para execução</label>
//             <input type="datetime-local" name="dataProgramada" className={inp} />
//           </div>

//           {/* Motivo */}
//           <div>
//             <label className="text-xs font-medium text-gray-600 mb-1.5 block">
//               Motivo / Sintoma observado <span className="text-red-500">*</span>
//             </label>
//             <textarea name="motivoOS" required minLength={5} rows={2} className={`${inp} resize-none`}
//               placeholder="Ex: Pressão de retorno PT02 abaixo de 0,05 MPa. Alarme ativo..." />
//           </div>

//           {/* Descrição */}
//           <div>
//             <label className="text-xs font-medium text-gray-600 mb-1.5 block">
//               Descrição detalhada <span className="text-red-500">*</span>
//             </label>
//             <textarea name="descricao" required minLength={10} rows={3} className={`${inp} resize-none`}
//               placeholder="Descreva o serviço a ser executado conforme manual ANTSPACE HK3 V6..." />
//           </div>

//           {erro && (
//             <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{erro}</div>
//           )}

//           <div className="flex items-center justify-end gap-3 pt-2">
//             <button type="button" onClick={onClose}
//               className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
//               Cancelar
//             </button>
//             <button type="submit" disabled={loading}
//               className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors">
//               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
//               {loading ? "Criando..." : "Criar OS"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }