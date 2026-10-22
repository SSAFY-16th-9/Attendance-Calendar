import { privateJson, sameOrigin } from "@/lib/admin-auth";
import { cohortCookie, cohortFor, viewableCohorts } from "@/lib/cohort";
import { getActor } from "@/lib/site-auth";

export const dynamic = "force-dynamic";

// Classes the calendar can switch between (public ones for visitors, all live ones for the core admin) and the one shown.
export async function GET(request: Request) {
  try {
    const actor = await getActor(request);
    const [options, selected] = await Promise.all([viewableCohorts(actor), cohortFor(request, actor)]);
    return privateJson({ cohorts: options, selected });
  } catch (error) { console.error("Cohort options failed", error); return privateJson({ error: "기수 목록을 불러오지 못했어요." }, 503); }
}

// Remember which of those classes this browser looks at.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "이 사이트에서 다시 시도해 주세요." }, 403);
  let input: { id?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return privateJson({ error: "기수를 확인해 주세요." }, 400); }
  try {
    const options = await viewableCohorts(await getActor(request));
    const option = options.find(cohort => cohort.id === input?.id);
    if (!option) return privateJson({ error: "볼 수 있는 기수가 아니에요." }, 404);
    return privateJson({ selected: option.id }, 200, { "Set-Cookie": cohortCookie(request, option.id) });
  } catch (error) { console.error("Cohort select failed", error); return privateJson({ error: "기수를 바꾸지 못했어요." }, 503); }
}
