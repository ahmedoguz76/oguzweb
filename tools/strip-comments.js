/**
 * tools/strip-comments
 * ----------------------------------------------------------------------------
 * JS kaynağından yorumları ayıklar. KAYNAK dosyalar dokunulmadan kalır —
 * "neden böyle" bilgisi depoda korunur, yalnızca dist'e gitmez.
 *
 * NEDEN REGEX DEĞİL
 * DECISIONS #4 regex tabanlı JS küçültmeyi doğruluk riski nedeniyle reddetti
 * ve bu karar geçerli. Buradaki yaklaşım regex değil, KARAKTER TARAYICISIDIR:
 * dize, şablon dizesi ve regex literal bağlamlarını takip eder, yalnızca
 * gerçekten yorum olan aralıkları çıkarır.
 *
 * GÜVENLİK AĞI
 * Çıktı `node --check` ile sözdizimi doğrulamasından geçirilir. Doğrulama
 * başarısız olursa ORİJİNAL dosya kullanılır ve uyarı basılır. Küçültme,
 * doğruluğu asla riske atmaz.
 */

import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/* `/` karakterinden önce gelen bu tokenlar, sonrasının regex literal
   olduğunu gösterir (bölme işlemi değil). */
const REGEX_PRECEDERS = new Set([
  "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*",
  "%", "^", "~", "<", ">", "\n",
]);

const KEYWORD_PRECEDERS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
  "throw", "case", "do", "else", "yield", "await",
]);

function lastSignificant(out) {
  for (let i = out.length - 1; i >= 0; i--) {
    const ch = out[i];
    if (ch === " " || ch === "\t") continue;
    return ch;
  }
  return "\n";
}

function endsWithKeyword(out) {
  const tail = out.slice(-12).match(/([A-Za-z$_][A-Za-z0-9$_]*)\s*$/);
  return tail ? KEYWORD_PRECEDERS.has(tail[1]) : false;
}

export function stripJsComments(source) {
  let out = "";
  let i = 0;
  const n = source.length;

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    /* --- dize --- */
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i++;
      while (i < n) {
        if (source[i] === "\\") {
          out += source[i] + (source[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += source[i];
        if (source[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    /* --- şablon dizesi (iç içe ${} dahil) --- */
    if (ch === "`") {
      out += ch;
      i++;
      let depth = 0;
      while (i < n) {
        if (source[i] === "\\") {
          out += source[i] + (source[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          depth++;
          out += "${";
          i += 2;
          continue;
        }
        if (source[i] === "}" && depth > 0) {
          depth--;
          out += "}";
          i++;
          continue;
        }
        out += source[i];
        if (source[i] === "`" && depth === 0) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    /* --- yorum mu, regex mi, bölme mi --- */
    if (ch === "/") {
      if (next === "/") {
        while (i < n && source[i] !== "\n") i++;
        continue;
      }
      if (next === "*") {
        i += 2;
        while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i++;
        i += 2;
        /* Yorumun yerine tek boşluk bırakılır ki bitişik tokenlar
           birleşmesin: "a" ile "b" arasındaki blok yorum silinirse
           "ab" oluşmamalı. */
        out += " ";
        continue;
      }

      const prev = lastSignificant(out);
      const isRegex = REGEX_PRECEDERS.has(prev) || endsWithKeyword(out);
      if (isRegex) {
        out += ch;
        i++;
        let inClass = false;
        while (i < n) {
          if (source[i] === "\\") {
            out += source[i] + (source[i + 1] ?? "");
            i += 2;
            continue;
          }
          if (source[i] === "[") inClass = true;
          else if (source[i] === "]") inClass = false;
          out += source[i];
          if (source[i] === "/" && !inClass) {
            i++;
            break;
          }
          i++;
        }
        continue;
      }
    }

    out += ch;
    i++;
  }

  /* Yorumların bıraktığı boş satırları toparla */
  return out
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

/** Sözdizimi doğrulaması. Başarısızsa false döner. */
export async function isValidModule(code) {
  const tmp = path.join(
    os.tmpdir(),
    `oguzweb-check-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`
  );
  try {
    await fs.writeFile(tmp, code, "utf8");
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  } finally {
    await fs.rm(tmp, { force: true });
  }
}
