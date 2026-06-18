'use client';

import { useRef, useState } from 'react';

interface EmailData {
  id: number;
  label: string;
  hero: string;
  subtitle: string | null;
  preview: string;
  body: string[];
  cta_label: string;
  cta_title: string;
  cta_description: string;
  cta_url: string;
  cta_button: string;
  signature: { name: string; company: string };
}

type Status = 'idle' | 'loading' | 'done' | 'error';

const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{hero}}</title>
</head>

<body style="margin:0; padding:0; background:#edf1f7; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 15px;">
    <tr>
      <td align="center">

        <!-- CONTAINER -->
        <table width="620" cellpadding="0" cellspacing="0" border="0"
          style="
            background:#ffffff;
            border-radius:18px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(0,0,0,0.08);
          ">

          <!-- HEADER -->
          <tr>
            <td
              style="
                background:linear-gradient(135deg,#07162d,#0f2f5c);
                padding:55px 40px;
                text-align:center;
              ">

              <!-- MINI LABEL -->
              <p style="
                color:#c8a96b;
                font-size:14px;
                letter-spacing:3px;
                margin:0 0 15px 0;
                font-weight:bold;
                text-transform:uppercase;
              ">
                {{label}}
              </p>

              <!-- HERO -->
              <h1 style="
                margin:0;
                color:#ffffff;
                font-size:42px;
                line-height:50px;
                font-weight:bold;
              ">
                {{hero}}
              </h1>

              <!-- SUBTITLE -->
              {{#if subtitle}}
              <p style="
                margin:22px 0 0 0;
                color:#d7e1f1;
                font-size:20px;
                line-height:34px;
              ">
                {{subtitle}}
              </p>
              {{/if}}

            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:45px 40px;">

              <!-- PREVIEW -->
              <p style="
                color:#0f2f5c;
                font-size:15px;
                line-height:26px;
                margin:0 0 32px 0;
                padding:16px 20px;
                background:#edf1f7;
                border-left:4px solid #c8a96b;
                border-radius:0 8px 8px 0;
                font-style:italic;
              ">
                {{preview}}
              </p>

              <!-- BODY PARAGRAPHS -->
              {{#each body}}
              <p style="
                color:#4a5568;
                font-size:16px;
                line-height:30px;
                margin-top:0;
                margin-bottom:22px;
              ">
                {{this}}
              </p>
              {{/each}}

              <!-- CTA BLOCK -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="
                  margin-top:35px;
                  background:linear-gradient(135deg,#0f2f5c,#07162d);
                  border-radius:14px;
                ">

                <tr>
                  <td style="padding:35px; text-align:center;">

                    <p style="
                      margin:0;
                      color:#c8a96b;
                      font-size:13px;
                      letter-spacing:2px;
                      font-weight:bold;
                    ">
                      {{cta_label}}
                    </p>

                    <p style="
                      margin:16px 0 0 0;
                      color:#ffffff;
                      font-size:32px;
                      line-height:42px;
                      font-weight:bold;
                    ">
                      {{cta_title}}
                    </p>

                    <p style="
                      margin:14px 0 0 0;
                      color:#d7e1f1;
                      font-size:18px;
                      line-height:30px;
                    ">
                      {{cta_description}}
                    </p>

                    <!-- BUTTON -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:30px auto 0 auto;">
                      <tr>
                        <td
                          align="center"
                          bgcolor="#c8a96b"
                          style="
                            border-radius:10px;
                          ">

                          <a
                            href="{{cta_url}}"
                            target="_blank"
                            style="
                              display:inline-block;
                              padding:18px 34px;
                              color:#ffffff;
                              text-decoration:none;
                              font-size:16px;
                              font-weight:bold;
                            ">
                            {{cta_button}}
                          </a>

                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

              </table>

              <!-- FOOTER -->
              <p style="
                margin-top:40px;
                color:#4a5568;
                font-size:16px;
                line-height:30px;
              ">
                Abraços,
              </p>

              <!-- SIGNATURE -->
              <p style="
                color:#4a5568;
                font-size:16px;
                line-height:30px;
                margin-bottom:0;
              ">
                <strong style="color:#0f2f5c;">
                  {{signature.name}}
                </strong>
                <br>
                {{signature.company}}
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderEmail(email: EmailData): string {
  let html = EMAIL_TEMPLATE;

  // Simple variable substitution (some appear multiple times, e.g. {{hero}})
  const vars: Record<string, string> = {
    '{{hero}}': escapeHtml(email.hero),
    '{{label}}': escapeHtml(email.label),
    '{{preview}}': escapeHtml(email.preview),
    '{{cta_label}}': escapeHtml(email.cta_label),
    '{{cta_title}}': escapeHtml(email.cta_title),
    '{{cta_description}}': escapeHtml(email.cta_description),
    '{{cta_url}}': escapeHtml(email.cta_url),
    '{{cta_button}}': escapeHtml(email.cta_button),
    '{{signature.name}}': escapeHtml(email.signature.name),
    '{{signature.company}}': escapeHtml(email.signature.company),
  };

  for (const [token, value] of Object.entries(vars)) {
    html = html.split(token).join(value);
  }

  // {{#if subtitle}}...{{subtitle}}...{{/if}}
  html = html.replace(
    /\{\{#if subtitle\}\}([\s\S]*?)\{\{\/if\}\}/,
    (_, inner: string) =>
      email.subtitle ? inner.replace('{{subtitle}}', escapeHtml(email.subtitle!)) : ''
  );

  // {{#each body}}...{{this}}...{{/each}}
  html = html.replace(
    /\{\{#each body\}\}([\s\S]*?)\{\{\/each\}\}/,
    (_, inner: string) =>
      email.body.map((para) => inner.replace('{{this}}', escapeHtml(para))).join('')
  );

  return html;
}

export default function EmailPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [renderedHtmls, setRenderedHtmls] = useState<string[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStatus('loading');
    setError('');
    setEmails([]);
    setRenderedHtmls([]);
    setOpenIndex(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/email', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Erro desconhecido.');
      setStatus('error');
      return;
    }

    const parsed: EmailData[] = data.emails ?? [];
    const htmls = parsed.map(renderEmail);
    setEmails(parsed);
    setRenderedHtmls(htmls);
    setStatus('done');
    setOpenIndex(parsed.length > 0 ? 0 : null);
  }

  async function handleCopy(index: number) {
    await navigator.clipboard.writeText(renderedHtmls[index]);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }

  function toggleEmail(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Top input panel */}
      <div className="w-full px-10 pt-10">
        <div className="bg-second border border-txt/5 shadow-sm rounded-2xl p-7 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-txt">
              Gerar Emails
            </h1>
            <p className="text-sm text-txt/60">
              Envie um PDF ou DOCX com sequência de e-mails para gerar os templates prontos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-txt">
                Documento (PDF ou DOC/DOCX)
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                className="block w-full text-sm text-txt/60
                  file:mr-3 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-txt file:text-primary
                  file:cursor-pointer cursor-pointer
                  border border-txt/15
                  rounded-md bg-primary px-1 py-1"
              />
            </label>

            {fileName && (
              <p className="text-xs text-txt/60">
                Selecionado: <span className="font-medium">{fileName}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-2.5 px-4 rounded-md bg-gold text-white text-sm font-semibold
                hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
            >
              {status === 'loading' ? 'Processando…' : 'Processar documento'}
            </button>
          </form>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 px-10 py-8 flex flex-col gap-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16 text-txt/60">
            <Spinner />
            <p className="text-sm">Analisando documento com IA. Aguarde…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {status === 'done' && emails.length > 0 && (
          <div className="flex flex-col gap-6">
            {/* Toggle buttons row */}
            <div className="flex flex-wrap gap-2">
              {emails.map((email, i) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => toggleEmail(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                    ${openIndex === i
                      ? 'bg-gold text-white border-gold'
                      : 'bg-primary text-txt/70 border-txt/15 hover:border-txt/40'
                    }`}
                >
                  Email {email.id}
                </button>
              ))}
            </div>

            {/* Preview panel for the selected email */}
            {openIndex !== null && (
              <div className="flex items-start gap-6">
                {/* Miniature iframe preview */}
                <div
                  className="rounded-xl border border-txt/10 overflow-hidden shrink-0"
                  style={{ width: 248, height: 360 }}
                >
                  <iframe
                    srcDoc={renderedHtmls[openIndex]}
                    title={`Preview Email ${emails[openIndex].id}`}
                    sandbox="allow-same-origin"
                    style={{
                      width: 620,
                      height: 900,
                      transform: 'scale(0.4)',
                      transformOrigin: 'top left',
                      border: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {/* Info + copy */}
                <div className="flex flex-col gap-3 min-w-0 pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-txt/50 uppercase tracking-widest font-semibold">
                      {emails[openIndex].label}
                    </span>
                    <p className="text-base font-semibold text-txt leading-snug">
                      {emails[openIndex].hero}
                    </p>
                    {emails[openIndex].subtitle && (
                      <p className="text-sm text-txt/60">
                        {emails[openIndex].subtitle}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-txt/50">
                    {emails[openIndex].body.length} parágrafo(s) · assinatura:{' '}
                    <em>{emails[openIndex].signature.name}</em>
                  </p>

                  <button
                    type="button"
                    onClick={() => handleCopy(openIndex)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-txt text-primary text-sm font-medium hover:bg-txt/85 transition-colors w-fit"
                  >
                    {copied === openIndex ? (
                      <>
                        <CheckIcon />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <CopyIcon />
                        Copiar HTML
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-6 w-6 text-txt/50"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
