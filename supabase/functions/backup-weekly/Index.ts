// ═══════════════════════════════════════════════════════════════
// Bibliyotèk — Edge Function : Sauvegarde hebdomadaire
// Déclenchement : cron "0 0 * * 0" (dimanche minuit UTC)
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function safeQuery(supabase: any, table: string) {
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) return [];
    return data ?? [];
  } catch (_) {
    return [];
  }
}

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("email")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (roleError || !adminRole?.email) {
      return new Response(
        JSON.stringify({ error: "Aucun admin trouvé" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const adminEmail = adminRole.email;
    let libraryName = "Votre bibliothèque";
    try {
      const { data: settings } = await supabase
        .from("lib_settings").select("value").eq("key", "libraryName").single();
      if (settings?.value) libraryName = settings.value;
    } catch (_) {}

    const [members, books, loans, reservations, events, donations, suggestions] =
      await Promise.all([
        safeQuery(supabase, "members"),
        safeQuery(supabase, "books"),
        safeQuery(supabase, "loans"),
        safeQuery(supabase, "reservations"),
        safeQuery(supabase, "events"),
        safeQuery(supabase, "donations"),
        safeQuery(supabase, "suggestions"),
      ]);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const backup = {
      meta: {
        library: libraryName,
        exported_at: now.toISOString(),
        version: "1.0",
        counts: {
          members: members.length,
          books: books.length,
          loans: loans.length,
          reservations: reservations.length,
          events: events.length,
          donations: donations.length,
          suggestions: suggestions.length,
        },
      },
      data: { members, books, loans, reservations, events, donations, suggestions },
    };

    const backupJson = JSON.stringify(backup, null, 2);
    const backupBase64 = btoa(unescape(encodeURIComponent(backupJson)));
    const filename = `bibliyotek-backup-${dateStr}.json`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bibliyotèk <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `Sauvegarde hebdomadaire — ${libraryName} (${dateStr})`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <div style="background:#0d1b2a;padding:32px;text-align:center;border-radius:8px 8px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Bibliyo<span style="color:#c9843a;">tèk</span></h1>
            <p style="color:rgba(255,255,255,.6);margin:8px 0 0;font-size:13px;">Sauvegarde automatique hebdomadaire</p>
          </div>
          <div style="background:#f5f0e8;padding:32px;border:1px solid #e0d8cc;border-radius:0 0 8px 8px;">
            <p style="font-size:15px;line-height:1.6;">Bonjour,<br/><br/>Voici la sauvegarde de <strong>${libraryName}</strong> du <strong>${dateStr}</strong>.</p>
            <table style="width:100%;margin:20px 0;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #e0d8cc;">Membres</td><td style="text-align:right;font-weight:700;color:#b8760a;">${backup.meta.counts.members}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #e0d8cc;">Livres</td><td style="text-align:right;font-weight:700;color:#b8760a;">${backup.meta.counts.books}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #e0d8cc;">Emprunts</td><td style="text-align:right;font-weight:700;color:#b8760a;">${backup.meta.counts.loans}</td></tr>
              <tr><td style="padding:8px 0;">Réservations</td><td style="text-align:right;font-weight:700;color:#b8760a;">${backup.meta.counts.reservations}</td></tr>
            </table>
            <p style="font-size:13px;color:#4a4a3a;">Le fichier <strong>${filename}</strong> est joint à cet email.</p>
            <p style="font-size:12px;color:#7a7a6a;margin-top:24px;border-top:1px solid #e0d8cc;padding-top:16px;">Questions ? <a href="mailto:obedsanon@gmail.com" style="color:#b8760a;">obedsanon@gmail.com</a></p>
          </div>
        </div>`,
        attachments: [{ filename, content: backupBase64 }],
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(
      JSON.stringify({ success: true, sent_to: adminEmail, counts: backup.meta.counts }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});