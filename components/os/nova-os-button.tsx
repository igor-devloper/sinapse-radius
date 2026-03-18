// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Plus, X, BookOpen, CalendarIcon, Clock } from "lucide-react";
// import { format, addHours } from "date-fns";
// import { ptBR } from "date-fns/locale";
// import { cn } from "@/lib/utils";
// import {
//   ATIVIDADE_LABEL, ATIVIDADES_PREVENTIVAS, ATIVIDADES_CORRETIVAS,
//   PRAZO_HORAS, ATIVIDADE_REFERENCIA_MANUAL, SUBSISTEMAS, prazoFormatado,
// } from "@/lib/sla-manual";
// import {
//   Select, SelectContent, SelectGroup, SelectItem,
//   SelectLabel, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Calendar } from "@/components/ui/calendar";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";

// interface Tecnico {
//   id: string;
//   nome: string;
//   cargo: string;
// }

// function DateTimePicker({
//   value, onChange, placeholder = "Selecionar data e hora", required,
// }: {
//   value: string; onChange: (iso: string) => void; placeholder?: string; required?: boolean;
// }) {
//   const [calOpen, setCalOpen] = useState(false);
//   const date = value ? new Date(value) : undefined;
//   const timeStr = date
//     ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
//     : "";

//   function handleDaySelect(day: Date | undefined) {
//     if (!day) return;
//     const prev = date ?? new Date();
//     day.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
//     onChange(day.toISOString());
//     setCalOpen(false);
//   }
//   function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
//     const [h, m] = e.target.value.split(":").map(Number);
//     const base = date ?? new Date();
//     base.setHours(h, m, 0, 0);
//     onChange(base.toISOString());
//   }

//   return (
//     <div className="flex gap-2">
//       <Popover open={calOpen} onOpenChange={setCalOpen}>
//         <PopoverTrigger asChild>
//           <Button variant="outline" type="button"
//             className={cn("flex-1 justify-start text-left font-normal rounded-xl border-gray-200 bg-white hover:bg-gray-50", !date && "text-muted-foreground")}>
//             <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
//             {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
//           </Button>
//         </PopoverTrigger>
//         <PopoverContent className="w-auto p-0" align="start">
//           <Calendar mode="single" selected={date} onSelect={handleDaySelect} locale={ptBR} initialFocus />
//         </PopoverContent>
//       </Popover>
//       <div className="relative">
//         <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
//         <input type="time" value={timeStr} onChange={handleTimeChange} required={required}
//           className="h-10 w-32 rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
//       </div>
//     </div>
//   );
// }

// function Field({ label, hint, required, children }: {
//   label: string; hint?: string; required?: boolean; children: React.ReactNode;
// }) {
//   return (
//     <div className="space-y-1.5">
//       <Label className="text-xs font-medium text-gray-600">
//         {label}{required && <span className="text-red-400 ml-0.5">*</span>}
//         {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
//       </Label>
//       {children}
//     </div>
//   );
// }

// // ✅ recebe tecnicos como prop
// export function NovaOSButton({ tecnicos = [] }: { tecnicos?: Tecnico[] }) {
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const router = useRouter();

//   const [form, setForm] = useState({
//     titulo: "", descricao: "", motivoOS: "",
//     tipoAtividade: "", prioridade: "MEDIA",
//     dataEmissaoAxia: "", dataProgramada: "",
//     subsistema: "", componenteTag: "", containerId: "",
//     responsavelId: "", // ✅ novo campo
//   });

//   function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

//   const prazoHoras = form.tipoAtividade ? PRAZO_HORAS[form.tipoAtividade] : null;
//   const dataLimitePreview = form.dataEmissaoAxia && prazoHoras
//     ? addHours(new Date(form.dataEmissaoAxia), prazoHoras) : null;

//   const tecnicoSelecionado = tecnicos.find((t) => t.id === form.responsavelId);

//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     setError("");
//     try {
//       const res = await fetch("/api/os", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           ...form,
//           dataEmissaoAxia: new Date(form.dataEmissaoAxia).toISOString(),
//           dataProgramada: form.dataProgramada ? new Date(form.dataProgramada).toISOString() : undefined,
//           componenteTag: form.componenteTag || undefined,
//           containerId: form.containerId || undefined,
//           responsavelId: form.responsavelId || undefined, // ✅
//         }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? "Erro ao criar OS");
//       setOpen(false);
//       router.push(`/ordens/${data.os.id}`);
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : "Erro inesperado");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <>
//       <button onClick={() => setOpen(true)}
//         className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors">
//         <Plus className="w-4 h-4" /> Nova OS
//       </button>

//       {open && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//             <div className="flex items-center justify-between p-6 border-b border-gray-100">
//               <div>
//                 <h2 className="text-lg font-semibold text-gray-900">Abrir Nova OS</h2>
//                 <p className="text-xs text-gray-400 mt-0.5">
//                   O prazo SLA é definido pelo tipo de atividade — Manual ANTSPACE HK3 V6
//                 </p>
//               </div>
//               <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
//                 <X className="w-4 h-4 text-gray-500" />
//               </button>
//             </div>

//             <form onSubmit={submit} className="p-6 space-y-4">
//               {error && (
//                 <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
//               )}

//               <Field label="Título da OS" required>
//                 <Input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)}
//                   className="rounded-xl border-gray-200 focus-visible:ring-violet-300"
//                   placeholder="Ex: Lubrificação rolamentos bomba P01" />
//               </Field>

//               <Field label="Tipo de atividade" hint="Define o prazo SLA" required>
//                 <Select required value={form.tipoAtividade} onValueChange={(v) => set("tipoAtividade", v)}>
//                   <SelectTrigger className="rounded-xl border-gray-200 focus:ring-violet-300 bg-white">
//                     <SelectValue placeholder="Selecionar atividade..." />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectGroup>
//                       <SelectLabel className="text-xs text-gray-400">Preventiva / Programada</SelectLabel>
//                       {ATIVIDADES_PREVENTIVAS.map((a) => (
//                         <SelectItem key={a} value={a}>
//                           {ATIVIDADE_LABEL[a]}{" "}
//                           <span className="text-gray-400 text-xs ml-1">({prazoFormatado(PRAZO_HORAS[a])})</span>
//                         </SelectItem>
//                       ))}
//                     </SelectGroup>
//                     <SelectGroup>
//                       <SelectLabel className="text-xs text-gray-400">Corretiva / Emergencial</SelectLabel>
//                       {ATIVIDADES_CORRETIVAS.map((a) => (
//                         <SelectItem key={a} value={a}>
//                           {ATIVIDADE_LABEL[a]}{" "}
//                           <span className="text-gray-400 text-xs ml-1">({prazoFormatado(PRAZO_HORAS[a])})</span>
//                         </SelectItem>
//                       ))}
//                     </SelectGroup>
//                   </SelectContent>
//                 </Select>
//                 {form.tipoAtividade && (
//                   <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 rounded-lg px-3 py-1.5 mt-1">
//                     <BookOpen className="w-3.5 h-3.5 shrink-0" />
//                     {ATIVIDADE_REFERENCIA_MANUAL[form.tipoAtividade]}
//                     {prazoHoras && <span className="ml-auto font-medium">{prazoFormatado(prazoHoras)}</span>}
//                   </div>
//                 )}
//               </Field>

//               <div className="grid grid-cols-2 gap-4">
//                 <Field label="Prioridade" required>
//                   <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v)}>
//                     <SelectTrigger className="rounded-xl border-gray-200 focus:ring-violet-300 bg-white">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="BAIXA">Baixa</SelectItem>
//                       <SelectItem value="MEDIA">Média</SelectItem>
//                       <SelectItem value="ALTA">Alta</SelectItem>
//                       <SelectItem value="CRITICA">Crítica</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </Field>
//                 <Field label="Container ID">
//                   <Input value={form.containerId} onChange={(e) => set("containerId", e.target.value)}
//                     className="rounded-xl border-gray-200 focus-visible:ring-violet-300" placeholder="Ex: HK3-01" />
//                 </Field>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <Field label="Subsistema" required>
//                   <Select required value={form.subsistema} onValueChange={(v) => set("subsistema", v)}>
//                     <SelectTrigger className="rounded-xl border-gray-200 focus:ring-violet-300 bg-white">
//                       <SelectValue placeholder="Selecionar..." />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {SUBSISTEMAS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
//                     </SelectContent>
//                   </Select>
//                 </Field>
//                 <Field label="TAG do componente">
//                   <Input value={form.componenteTag} onChange={(e) => set("componenteTag", e.target.value)}
//                     className="rounded-xl border-gray-200 focus-visible:ring-violet-300" placeholder="Ex: P01, G04, V202" />
//                 </Field>
//               </div>

//               {/* ✅ Responsável */}
//               <Field label="Técnico responsável">
//                 <Select value={form.responsavelId} onValueChange={(v) => set("responsavelId", v)}>
//                   <SelectTrigger className="rounded-xl border-gray-200 focus:ring-violet-300 bg-white">
//                     <SelectValue placeholder="Selecionar responsável..." />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {tecnicos.map((t) => (
//                       <SelectItem key={t.id} value={t.id}>
//                         <div className="flex items-center gap-2">
//                           <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
//                             {t.nome.charAt(0).toUpperCase()}
//                           </div>
//                           {t.nome}
//                           <span className="text-xs text-gray-400 capitalize ml-1">
//                             ({t.cargo.charAt(0) + t.cargo.slice(1).toLowerCase()})
//                           </span>
//                         </div>
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 {tecnicoSelecionado && (
//                   <div className="flex items-center gap-2 mt-1.5 bg-violet-50 rounded-xl px-3 py-2 border border-violet-100">
//                     <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
//                       {tecnicoSelecionado.nome.charAt(0).toUpperCase()}
//                     </div>
//                     <span className="text-sm font-medium text-gray-800">{tecnicoSelecionado.nome}</span>
//                     <span className="text-xs text-violet-500 capitalize ml-1">
//                       {tecnicoSelecionado.cargo.charAt(0) + tecnicoSelecionado.cargo.slice(1).toLowerCase()}
//                     </span>
//                     <button type="button" onClick={() => set("responsavelId", "")}
//                       className="ml-auto p-0.5 hover:bg-violet-100 rounded transition-colors">
//                       <X className="w-3 h-3 text-violet-400" />
//                     </button>
//                   </div>
//                 )}
//               </Field>

//               <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 space-y-3">
//                 <Field label="Data e hora de emissão da OS — Axia (CONTRATANTE)" required>
//                   <DateTimePicker value={form.dataEmissaoAxia} onChange={(iso) => set("dataEmissaoAxia", iso)}
//                     placeholder="Selecionar data e hora" required />
//                 </Field>
//                 {dataLimitePreview && (
//                   <div className="bg-white/80 rounded-lg px-3 py-2 flex justify-between text-xs">
//                     <span className="text-gray-500">Prazo limite (SLA):</span>
//                     <span className="font-semibold text-violet-700">
//                       {format(dataLimitePreview, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
//                     </span>
//                   </div>
//                 )}
//               </div>

//               <Field label="Data programada para execução">
//                 <DateTimePicker value={form.dataProgramada} onChange={(iso) => set("dataProgramada", iso)} placeholder="Opcional" />
//               </Field>

//               <Field label="Descrição" required>
//                 <Textarea required rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)}
//                   className="rounded-xl border-gray-200 focus-visible:ring-violet-300 resize-none"
//                   placeholder="Descreva o escopo do serviço conforme manual..." />
//               </Field>

//               <Field label="Motivo / Sintoma observado" required>
//                 <Textarea required rows={2} value={form.motivoOS} onChange={(e) => set("motivoOS", e.target.value)}
//                   className="rounded-xl border-gray-200 focus-visible:ring-violet-300 resize-none"
//                   placeholder="Causa identificada, alarme ativo, leitura anormal..." />
//               </Field>

//               <div className="flex gap-3 pt-2">
//                 <button type="button" onClick={() => setOpen(false)}
//                   className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
//                   Cancelar
//                 </button>
//                 <button type="submit" disabled={loading}
//                   className="flex-1 py-2.5 text-sm text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium">
//                   {loading ? "Abrindo OS..." : "Abrir OS"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }