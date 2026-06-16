'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Users, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Flag } from '@/components/flag';
import {
  apiBroadcastPreviewCount,
  apiCreateBroadcast,
  apiListBroadcasts,
} from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';
import type { BroadcastFilters, BroadcastItem } from '@/lib/types';

interface FormState {
  messageUz: string;
  messageRu: string;
  audience: 'all' | 'with-orders' | 'no-orders' | 'inactive-7' | 'inactive-30';
  language: '' | 'uz' | 'ru';
}

function filtersFromForm(form: FormState): BroadcastFilters {
  const base: BroadcastFilters = { excludeBlocked: true };
  if (form.language) base.language = form.language;

  switch (form.audience) {
    case 'with-orders':
      base.hasOrders = true;
      break;
    case 'no-orders':
      base.hasOrders = false;
      break;
    case 'inactive-7':
      base.noOrdersInDays = 7;
      base.activeInDays = 30;
      break;
    case 'inactive-30':
      base.noOrdersInDays = 30;
      break;
    case 'all':
    default:
      break;
  }
  return base;
}

export default function BroadcastsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState<FormState>({
    messageUz: '',
    messageRu: '',
    audience: 'all',
    language: '',
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: apiListBroadcasts,
    refetchInterval: (q) => {
      const data = q.state.data as BroadcastItem[] | undefined;
      const hasRunning = data?.some((b) => b.status === 'pending' || b.status === 'running');
      return hasRunning ? 3000 : false;
    },
  });

  const filters = useMemo(() => filtersFromForm(form), [form]);

  const { data: preview } = useQuery({
    queryKey: ['broadcast-preview', filters],
    queryFn: () => apiBroadcastPreviewCount(filters),
    enabled: open,
    staleTime: 5_000,
  });

  const create = useMutation({
    mutationFn: () =>
      apiCreateBroadcast({
        messageUz: form.messageUz.trim(),
        messageRu: form.messageRu.trim() || null,
        filters,
      }),
    onSuccess: (res) => {
      toast.success(`Yuborilmoqda: ${res.totalCount} foydalanuvchi`);
      qc.invalidateQueries({ queryKey: ['broadcasts'] });
      setOpen(false);
      setConfirm(false);
      setForm({ messageUz: '', messageRu: '', audience: 'all', language: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit = form.messageUz.trim().length > 0 && (preview?.count ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="Xabarnomalar"
        description="Foydalanuvchilarga ommaviy xabar yuborish"
        rightSlot={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={16} /> Yangi xabar
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !list || list.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
            Hozircha xabarlar yo&apos;q. Yangi xabar yaratish uchun yuqori-o&apos;ngdagi tugmani bosing.
          </div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((b) => (
            <BroadcastRow key={b.id} item={b} />
          ))}
        </ul>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Yangi xabar">
        <div className="space-y-4">
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <Flag code="uz" /> Xabar matni (O&apos;zbek) *
              </span>
            }
            hint="HTML formatlash: <b>qalin</b>, <i>kursiv</i>, <a href='...'>havola</a>"
          >
            <Textarea
              value={form.messageUz}
              onChange={(e) => setForm({ ...form, messageUz: e.target.value })}
              placeholder="Salom! Bizda yangi mahsulotlar..."
              rows={5}
            />
          </Field>
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <Flag code="ru" /> Xabar matni (Русский)
              </span>
            }
            hint="Bo'sh qoldirilsa, ruschalovchi userlar ham uzbek matnini ko'radi"
          >
            <Textarea
              value={form.messageRu}
              onChange={(e) => setForm({ ...form, messageRu: e.target.value })}
              placeholder="Привет! У нас новые товары..."
              rows={5}
            />
          </Field>

          <Field label="Kimga yuborish?">
            <Select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as FormState['audience'] })}
            >
              <option value="all">Barcha foydalanuvchilar</option>
              <option value="with-orders">Faqat order qilganlar</option>
              <option value="no-orders">Hech qachon order qilmaganlar</option>
              <option value="inactive-7">Oxirgi 7 kunda order qilmaganlar (faol bo&apos;lganlar)</option>
              <option value="inactive-30">Oxirgi 30 kunda order qilmaganlar</option>
            </Select>
          </Field>

          <Field label="Til filtri">
            <Select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as FormState['language'] })}
            >
              <option value="">Hammasi (har kim o&apos;z tilida)</option>
              <option value="uz">🇺🇿 Faqat o&apos;zbek tilidagilar</option>
              <option value="ru">🇷🇺 Faqat rus tilidagilar</option>
            </Select>
          </Field>

          <div className="rounded-xl bg-[var(--color-primary)]/10 px-4 py-3 flex items-center gap-3">
            <Users size={18} className="text-[var(--color-primary)]" />
            <div className="text-sm">
              <span className="font-semibold">Adresatlar: </span>
              <span className="font-bold text-[var(--color-primary)]">
                {preview?.count?.toLocaleString('ru-RU') ?? '...'}
              </span>{' '}
              foydalanuvchi
            </div>
          </div>

          {!confirm ? (
            <Button
              fullWidth
              size="lg"
              disabled={!canSubmit}
              onClick={() => setConfirm(true)}
            >
              <Send size={16} /> Yuborishga tayyor
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
                ⚠️ <b>{preview?.count?.toLocaleString('ru-RU')}</b> foydalanuvchiga xabar yuboriladi.
                Bu amalni bekor qilib bo&apos;lmaydi.
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => setConfirm(false)}>
                  Orqaga
                </Button>
                <Button
                  fullWidth
                  variant="danger"
                  loading={create.isPending}
                  onClick={() => create.mutate()}
                >
                  ✅ Yuborishni boshlash
                </Button>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}

function BroadcastRow({ item }: { item: BroadcastItem }) {
  const ageMs = Date.now() - new Date(item.createdAt).getTime();
  const ageLabel =
    ageMs < 60_000
      ? 'hozir'
      : ageMs < 3_600_000
        ? `${Math.round(ageMs / 60_000)} daq oldin`
        : ageMs < 86_400_000
          ? `${Math.round(ageMs / 3_600_000)} soat oldin`
          : new Date(item.createdAt).toLocaleDateString('ru-RU');

  const filterSummary = describeFilters(item.filters);

  const progress = item.totalCount > 0 ? Math.round((item.sentCount / item.totalCount) * 100) : 0;

  return (
    <li>
      <Card>
        <CardHeader
          title={<StatusBadge status={item.status} />}
          action={<span className="text-xs text-[var(--color-text-muted)]">{ageLabel}</span>}
        />
        <CardBody className="space-y-3">
          <p className="text-sm whitespace-pre-line line-clamp-4">{item.messageUz}</p>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge tone="gray">
              <Users size={11} /> {filterSummary}
            </Badge>
            <Badge tone={item.failedCount > 0 ? 'red' : 'green'}>
              {item.sentCount} / {item.totalCount}
              {item.failedCount > 0 && ` (${item.failedCount} fail)`}
            </Badge>
          </div>

          {(item.status === 'running' || item.status === 'pending') && (
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </CardBody>
      </Card>
    </li>
  );
}

function StatusBadge({ status }: { status: BroadcastItem['status'] }) {
  const map: Record<BroadcastItem['status'], { label: string; icon: React.ReactNode; tone: 'gray' | 'green' | 'red' | 'amber' }> = {
    pending: { label: 'Kutilmoqda', icon: <Clock size={12} />, tone: 'amber' },
    running: { label: 'Yuborilmoqda', icon: <Loader2 size={12} className="animate-spin" />, tone: 'amber' },
    completed: { label: 'Yakunlandi', icon: <CheckCircle2 size={12} />, tone: 'green' },
    failed: { label: 'Xato', icon: <AlertCircle size={12} />, tone: 'red' },
  };
  const m = map[status];
  return (
    <Badge tone={m.tone}>
      {m.icon} <span className="ml-1">{m.label}</span>
    </Badge>
  );
}

function describeFilters(f: BroadcastFilters): string {
  const parts: string[] = [];
  if (f.hasOrders === true) parts.push('order qilganlar');
  else if (f.hasOrders === false) parts.push('order qilmaganlar');
  if (f.noOrdersInDays) parts.push(`${f.noOrdersInDays} kun ichida buyurtma yo'q`);
  if (f.activeInDays) parts.push(`${f.activeInDays} kun ichida faol`);
  if (f.language) parts.push(f.language === 'uz' ? "o'zbek tili" : 'rus tili');
  return parts.length === 0 ? 'Hamma' : parts.join(' • ');
}
