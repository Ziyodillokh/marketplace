import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AutofillResult {
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** OpenAI (GPT) bilan ishlash — avto-to'ldirish va rasm yaxshilash. */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('OPENAI_API_KEY') ?? '';
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  private ensure(): void {
    if (!this.apiKey) {
      throw new BadRequestException('AI sozlanmagan (OPENAI_API_KEY yo\'q)');
    }
  }

  /** Mahsulot rasmi (yoki nom) asosida UZ/RU nom va tavsif yaratadi. */
  async autofill(imageDataUrl: string | null, hint: string): Promise<AutofillResult> {
    this.ensure();
    const model = 'gpt-4o-mini';
    const sys =
      "Sen onlayn do'kon uchun mahsulot kartochkasini to'ldiruvchi yordamchisan. " +
      "Berilgan rasm va/yoki nomdan mahsulotni aniqlab, sotuvga mos qisqa nom va " +
      "jozibali tavsif yoz. Faqat JSON qaytar: " +
      '{"titleUz","titleRu","descriptionUz","descriptionRu"}. ' +
      "titleUz/descriptionUz — o'zbekcha (lotin), titleRu/descriptionRu — ruscha. " +
      'Tavsif 1-3 jumla, ortiqcha va\'da bermasdan.';

    const userContent: unknown[] = [
      { type: 'text', text: hint ? `Mahsulot haqida: ${hint}` : 'Rasmdagi mahsulotni to\'ldir.' },
    ];
    if (imageDataUrl) {
      userContent.push({ type: 'image_url', image_url: { url: imageDataUrl } });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(`OpenAI autofill failed: ${res.status} ${errText.slice(0, 300)}`);
      throw new BadRequestException('AI to\'ldirishda xatolik');
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    let parsed: Partial<AutofillResult> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('AI javobini o\'qib bo\'lmadi');
    }
    return {
      titleUz: String(parsed.titleUz ?? '').slice(0, 200),
      titleRu: String(parsed.titleRu ?? parsed.titleUz ?? '').slice(0, 200),
      descriptionUz: String(parsed.descriptionUz ?? '').slice(0, 2000),
      descriptionRu: String(parsed.descriptionRu ?? parsed.descriptionUz ?? '').slice(0, 2000),
      model,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  /** Mahsulot rasmini yaxshilaydi (toza fon, professional ko'rinish). PNG buffer qaytaradi. */
  async enhanceImage(image: Buffer): Promise<{ buffer: Buffer; model: string }> {
    this.ensure();
    const model = 'gpt-image-1';
    const form = new FormData();
    form.append('model', model);
    form.append(
      'prompt',
      'Professional e-commerce product photo for a sales card. ' +
        'Keep the product EXACTLY the same — same shape, colors, logo, text and details, do not redesign it. ' +
        'Place it centered on a clean, soft, evenly-lit neutral/white studio background. ' +
        'Studio softbox lighting, crisp sharp focus, true-to-life colors, subtle natural shadow and gentle floor reflection, ' +
        'high resolution, marketplace catalog style. ' +
        'No text, no watermark, no logos added, no extra props or people.',
    );
    form.append('size', '1024x1024');
    form.append('quality', 'high');
    form.append('image', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'image.png');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(`OpenAI enhance failed: ${res.status} ${errText.slice(0, 300)}`);
      throw new BadRequestException('Rasmni yaxshilashda xatolik');
    }
    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new BadRequestException('AI rasm qaytarmadi');
    return { buffer: Buffer.from(b64, 'base64'), model };
  }
}
