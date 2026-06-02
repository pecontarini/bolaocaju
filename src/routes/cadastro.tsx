import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState } from "react";

import { LayoutCliente } from "@/components/site/LayoutCliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/store/cliente";
import {
  mascararTelefone,
  normalizarE164,
  REGEX_E164_BR,
} from "@/lib/telefone";

const schema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Diga seu nome (mínimo 2 letras)")
    .max(100, "Nome muito longo"),
  telefone: z
    .string()
    .transform((v) => normalizarE164(v))
    .refine((v) => REGEX_E164_BR.test(v), "Telefone inválido — use DDD + número"),
  maioridade: z.literal(true, {
    errorMap: () => ({ message: "Confirme que você tem 18 anos ou mais" }),
  }),
  opt_in_marketing: z.boolean().default(false),
});

type FormValues = z.input<typeof schema>;

export const Route = createFileRoute("/cadastro")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "/palpitar",
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const setCliente = useCliente((s) => s.setCliente);
  const [enviando, setEnviando] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      telefone: "",
      maioridade: false as unknown as true,
      opt_in_marketing: false,
    },
  });

  async function onSubmit(values: FormValues) {
    setEnviando(true);
    const telefoneE164 = normalizarE164(values.telefone);
    const nome = values.nome.trim();
    try {
      const { data: existente, error: errSel } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("telefone", telefoneE164)
        .maybeSingle();
      if (errSel) throw errSel;

      let clienteId: string;
      let nomeFinal = nome;
      if (existente) {
        clienteId = existente.id as string;
        nomeFinal = (existente.nome as string) || nome;
      } else {
        const { data: novo, error: errIns } = await supabase
          .from("clientes")
          .insert({
            telefone: telefoneE164,
            nome,
            maioridade: true,
            opt_in_marketing: values.opt_in_marketing,
          })
          .select("id, nome")
          .single();
        if (errIns) throw errIns;
        clienteId = novo.id as string;
        nomeFinal = (novo.nome as string) || nome;
      }

      setCliente({ telefone: telefoneE164, nome: nomeFinal, cliente_id: clienteId });
      toast.success(`Bem-vindo, ${nomeFinal}!`);
      navigate({ to: next as "/palpitar" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.toLowerCase().includes("maioridade")) {
        toast.error("É preciso confirmar que você tem 18 anos ou mais.");
      } else {
        toast.error("Não consegui te cadastrar agora. Tente de novo em instantes.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutCliente>
      <div className="flex flex-col items-center mb-5">
        <img
          src="/assets/03-logo-texto-verde.png"
          alt="Caju Limão"
          className="h-16 w-auto"
        />
        <h1 className="font-display text-2xl text-cl-verde-escuro mt-3">
          Bora palpitar?
        </h1>
        <p className="text-sm text-cl-cinza-texto text-center mt-1">
          Só precisamos do seu nome e telefone pra registrar seu palpite.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-cl-verde-escuro">Seu nome</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex.: João da Silva"
                    autoComplete="name"
                    className="h-12 text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-cl-verde-escuro">
                  Telefone com DDD
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={mascararTelefone(field.value ?? "")}
                    onChange={(e) => field.onChange(mascararTelefone(e.target.value))}
                    placeholder="(61) 99999-9999"
                    inputMode="tel"
                    autoComplete="tel-national"
                    className="h-12 text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maioridade"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 space-y-0 rounded-xl border border-cl-verde/30 bg-card p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5 size-5"
                  />
                </FormControl>
                <div className="flex-1">
                  <FormLabel className="text-sm font-medium text-cl-verde-escuro cursor-pointer">
                    Declaro ter 18 anos ou mais
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="opt_in_marketing"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 space-y-0 rounded-xl border border-border bg-card p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5 size-5"
                  />
                </FormControl>
                <FormLabel className="text-sm text-cl-cinza-texto cursor-pointer">
                  Quero receber novidades do Caju Limão
                </FormLabel>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={enviando}
            className="w-full h-14 text-base font-semibold bg-cl-verde hover:bg-cl-verde-escuro text-white rounded-xl shadow-md"
          >
            {enviando ? "Salvando…" : "Continuar"}
          </Button>
        </form>
      </Form>
    </LayoutCliente>
  );
}