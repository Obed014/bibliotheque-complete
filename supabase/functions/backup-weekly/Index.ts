// ═══════════════════════════════════════════════════════════════
// Bibliyotèk — Edge Function : Sauvegarde hebdomadaire
// Déclenchement : cron "0 0 * * 0" (dimanche minuit UTC)
// Envoie un fichier JSON de sauvegarde à l'admin de la bibliothèque
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Récupérer l'email admin et le nom de la bibliothèque
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("email")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminRole?.email) {
      return new Response("Aucun admin trouvé", { status: 400 });
    }

    const adminEmail = adminRole.email;

    // Récupérer le nom de la bibliothèque depuis lib_settings si elle existe
    let libraryName = "Votre bibliothèque";
    try {
      const { data: settings } = await supabase
        .from("lib_settings")
        .select("value")
        .eq("key", "libraryName")
        .single();
      if (settings?.value) libraryName = settings.value;
    } catch (_) { /* table optionnelle */ }

    // 2. Exporter toutes les tables en parallèle
    const [members, books, loans, reservations, events, donations, suggestions] =
      await Promise.all([
        supabase.from("members").select("*"),
        supabase.from("books").select("*"),
        supabase.from("loans").select("*"),
        supabase.from("reservations").select("*").catch(() => ({ data: [] })),
        supabase.from("events").select("*").catch(() => ({ data: [] })),
        supabase.from("donations").select("*").catch(() => ({ data: [] })),
        supabase.from("suggestions").select("*").catch(() => ({ data: [] })),
      ]);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const backup = {
      meta: {
        library: libraryName,
        exported_at: now.toISOString(),
        version: "1.0",
        counts: {
          members: members.data?.length ?? 0,
          books: books.data?.length ?? 0,
          loans: loans.data?.length ?? 0,
          reservations: reservations.data?.length ?? 0,
          events: events.data?.length ?? 0,
          donations: donations.data?.length ?? 0,
          suggestions: suggestions.data?.length ?? 0,
        },
      },
      data: {
        members: members.data ?? [],
        books: books.data ?? [],
        loans: loans.data ?? [],
        reservations: reservations.data ?? [],
        events: events.data ?? [],
        donations: donations.data ?? [],
        suggestions: suggestions.data ?? [],
      },
    };

    const backupJson = JSON.stringify(backup, null, 2);
    const backupBase64 = btoa(unescape(encodeURIComponent(backupJson)));
    const filename = `bibliyotek-backup-${dateStr}.json`;

    // 3. Envoyer par email via Resend avec le fichier en pièce jointe
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bibliyotèk <backup@bibliyotek.site>",
        to: [adminEmail],
        subject: `📦 Sauvegarde hebdomadaire — ${libraryName} (${dateStr})`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a14;">
            <div style="background: #0d1b2a; padding: 32px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #fff; font-size: 22px; margin: 0;">
                Bibliyo<span style="color: #c9843a;">tèk</span>
              </h1>
              <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0; font-size: 13px;">
                Sauvegarde automatique hebdomadaire
              </p>
            </div>
            <div style="background: #f5f0e8; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0d8cc;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
                Bonjour,<br/><br/>
                Voici la sauvegarde hebdomadaire de <strong>${libraryName}</strong>,
                générée automatiquement le <strong>${now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>.
              </p>

              <div style="background: #fff; border: 1px solid #e0d8cc; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #7a7a6a;">
                  Contenu de la sauvegarde
                </p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #f0ebe0;">
                    <td style="padding: 8px 0; color: #4a4a3a;">👤 Membres</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #b8760a;">${backup.meta.counts.members}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f0ebe0;">
                    <td style="padding: 8px 0; color: #4a4a3a;">📚 Livres</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #b8760a;">${backup.meta.counts.books}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f0ebe0;">
                    <td style="padding: 8px 0; color: #4a4a3a;">🔄 Emprunts (total)</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #b8760a;">${backup.meta.counts.loans}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a4a3a;">📅 Réservations</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #b8760a;">${backup.meta.counts.reservations}</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0 0 8px; font-size: 13px; color: #4a4a3a; line-height: 1.6;">
                Le fichier <strong>${filename}</strong> est joint à cet email.
                Conservez-le en lieu sûr — il contient l'intégralité de vos données et peut être restauré depuis Bibliyotèk.
              </p>

              <p style="margin: 24px 0 0; font-size: 12px; color: #7a7a6a; border-top: 1px solid #e0d8cc; padding-top: 16px;">
                Cet email est envoyé automatiquement chaque dimanche.<br/>
                Questions ? Contactez <a href="mailto:obedsanon@gmail.com" style="color: #b8760a;">obedsanon@gmail.com</a>
              </p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename,
            content: backupBase64,
          },
        ],
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    console.log(`✅ Sauvegarde envoyée à ${adminEmail} — ${backup.meta.counts.members} membres, ${backup.meta.counts.books} livres`);

    return new Response(
      JSON.stringify({ success: true, sent_to: adminEmail, counts: backup.meta.counts }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Erreur sauvegarde:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});