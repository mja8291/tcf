import { SurveyProvider } from "@/lib/survey-context";
import { SurveyTimerBar } from "@/components/survey/SurveyTimerBar";

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <SurveyProvider>
      <SurveyTimerBar />
      {children}
    </SurveyProvider>
  );
}
