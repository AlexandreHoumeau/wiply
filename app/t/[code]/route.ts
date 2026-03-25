import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ code: string }> }
) {
	const { code } = await params;
	const supabase = await createClient();
	const headerList = await headers();

	// 1. Récupérer le lien
	const { data: link } = await supabase
		.from("tracking_links")
		.select("*, agencies(website), opportunity:opportunities(slug)")
		.eq("short_code", code)
		.single();

	if (!link || !link.is_active) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	// 2. Analyse poussée du visiteur
	const ua = headerList.get("user-agent") || "";
	const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
	const referer = headerList.get("referer") || "Direct / Email";

	// Détection simplifiée du device
	let device = "Desktop";
	if (/mobile/i.test(ua)) device = "Mobile";
	else if (/tablet/i.test(ua)) device = "Tablet";

	// Détection simplifiée de l'OS
	let os = "Autre";
	if (/windows/i.test(ua)) os = "Windows";
	else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
	else if (/android/i.test(ua)) os = "Android";
	else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

	// Détection du navigateur
	let browser = "Autre";
	if (/samsungbrowser/i.test(ua)) browser = "Samsung";
	else if (/opr\//i.test(ua)) browser = "Opera";
	else if (/edg\//i.test(ua)) browser = "Edge";
	else if (/chrome/i.test(ua)) browser = "Chrome";
	else if (/firefox/i.test(ua)) browser = "Firefox";
	else if (/safari/i.test(ua)) browser = "Safari";

	// Géolocalisation via les headers Vercel (automatiques en prod, null en local)
	const countryCode = headerList.get("x-vercel-ip-country") || null;
	const city = headerList.get("x-vercel-ip-city")
		? decodeURIComponent(headerList.get("x-vercel-ip-city")!)
		: null;

	// 3. Enregistrement du clic enrichi
	await supabase.from("tracking_clicks").insert({
		tracking_link_id: link.id,
		ip_address: ip,
		user_agent: ua,
		device_type: device,
		os_type: os,
		browser,
		city,
		country_code: countryCode,
		referer: referer
	});

	// Mise à jour du compteur global
	await supabase.rpc('increment_click_count', { link_id: link.id });

	// 5. Notify agency members who opted in (fire-and-forget)
	supabaseAdmin
		.from("profiles")
		.select("id")
		.eq("agency_id", link.agency_id)
		.eq("notify_tracking_click", true)
		.then(({ data: members }) => {
			if (!members?.length) return;
			const label = link.campaign_name ?? link.original_url;
			for (const member of members) {
				createNotification({
					agencyId: link.agency_id,
					userId: member.id,
					type: "tracking_click",
					title: "Lien cliqué",
					body: `Quelqu'un a cliqué sur "${label}" (${device}, ${os})`,
					metadata: { tracking_link_id: link.id, opportunity_slug: (link.opportunity as any)?.slug ?? null, device, os },
				});
			}
		});

	// 6. Redirection
	const redirectUrl = link.original_url || link.agencies?.website || "/";
	return NextResponse.redirect(new URL(redirectUrl));
}