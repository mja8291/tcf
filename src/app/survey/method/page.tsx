"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, MapPin } from "lucide-react";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Field, TextInput } from "@/components/ui/Field";
import { MethodCard } from "@/components/survey/MethodCard";
import { useSurvey } from "@/lib/survey-context";

export default function MethodChoicePage() {
  const router = useRouter();
  const { state, setRespondent, setMethod } = useSurvey();
  const [asm, setAsm] = useState(state.asm);
  const [apm, setApm] = useState(state.apm);
  const [principal, setPrincipal] = useState(state.principal);

  useEffect(() => {
    if (!state.school) router.replace("/survey/find-school");
  }, [state.school, router]);

  function choose(method: 1 | 2) {
    setRespondent(asm, apm, principal);
    setMethod(method);
    router.push(method === 1 ? "/survey/m1" : "/survey/m2");
  }

  if (!state.school) return null;

  return (
    <ScreenShell>
      <TopBar
        title="Survey method"
        subtitle={`${state.school.name} · ${state.school.region}`}
        onBack={() => router.push("/survey/find-school")}
      />

      <Field label="Responding ASM">
        <TextInput placeholder="Admin and support manager" value={asm} onChange={(e) => setAsm(e.target.value)} />
      </Field>
      <Field label="Accompanying APM">
        <TextInput placeholder="Assistant project manager" value={apm} onChange={(e) => setApm(e.target.value)} />
      </Field>
      <Field label="School principal">
        <TextInput
          placeholder="Name, if present"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
        />
      </Field>

      <MethodCard
        icon={ClipboardList}
        title="Method 1 — whole campus"
        description="Score every item once for the whole campus. Faster, less granular."
        onClick={() => choose(1)}
      />
      <MethodCard
        icon={MapPin}
        title="Method 2 — by location"
        description="Score each classroom, toilet, roof section etc. separately. Slower, more precise."
        onClick={() => choose(2)}
      />
    </ScreenShell>
  );
}
