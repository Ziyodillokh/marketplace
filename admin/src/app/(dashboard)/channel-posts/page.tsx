'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Radio, Send, Upload, Trash2, Clock, CheckCircle2, AlertCircle, ShoppingBag, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiChannelConfig,
  apiSetChannel,
  apiListChannelPosts,
  apiCreateChannelPost,
  apiDeleteChannelPost,
  apiUploadImage,
  type ChannelPostStatus,
} from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';

/** Hozirgi vaqtni datetime-local input formatiga (mahalliy) o'giradi. */
function nowLocalInput(offsetMinutes = 0): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS: Record<ChannelPostStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  SCHEDULED: { label: 'Rejada', cls: 'bg-blue-50 text-blue-600', Icon: Clock },
  PUBLISHED: { label: 'Joylandi', cls: 'bg-green-50 text-green-600', Icon: CheckCircle2 },
  FAILED: { label: 'Xato', cls: 'bg-red-50 text-red-600', Icon: AlertCircle },
  CANCELLED: { label: 'Bekor', cls: 'bg-gray-100 text-gray-500', Icon: X },
};

export default function ChannelPostsPage() {
  const qc = useQueryClient();
  const { data: config, isLoading: cfgLoading } = useQuery({
    queryKey: ['channel-config'],
    queryFn: apiChannelConfig,
  });
  const { data: posts } = useQuery({ queryKey: ['channel-posts'], queryFn: apiListChannelPosts });

  // Kanal ID
  const [channelId, setChannelId] = useState('');
  useEffect(() => {
    if (config) setChannelId(config.channelId);
  }, [config]);
  const saveChannel = useMutation({
    mutationFn: () => apiSetChannel(channelId.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channel-config'] });
      toast.success('Kanal saqlandi');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Yangi e'lon
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buyButton, setBuyButton] = useState(true);
  const [buttonText, setButtonText] = useState('');
  const [now, setNow] = useState(false);
  const [when, setWhen] = useState(nowLocalInput(10));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImg(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const r = await apiUploadImage(file);
      setImageUrl(r.url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const create = useMutation({
    mutationFn: () =>
      apiCreateChannelPost({
        text: text.trim(),
        imageUrl: imageUrl || undefined,
        buyButton,
        buttonText: buttonText.trim() || undefined,
        scheduledAt: new Date(now ? Date.now() : new Date(when).getTime()).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channel-posts'] });
      setText('');
      setImageUrl('');
      setButtonText('');
      toast.success(now ? "E'lon joylandi" : "E'lon rejaga qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiDeleteChannelPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channel-posts'] });
      toast.success("E'lon o'chirildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const channelReady = !!config?.channelId && config.hasBot;

  return (
    <div className="pb-10">
      <PageHeader title="Kanal e'lonlari" description="Telegram kanalingizga rejalashtirilgan postlar" />

      <div className="w-full md:max-w-2xl md:mx-auto space-y-3">
        {/* Kanal sozlamasi */}
        <Card>
          <CardHeader title="Kanal" />
          <CardBody className="space-y-3">
            {cfgLoading ? (
              <Skeleton className="h-10" />
            ) : (
              <>
                {!config?.hasBot && (
                  <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1 leading-snug">
                      Avval <b>Sozlamalar → Telegram bot</b> bo&apos;limidan botingizni ulang.
                    </p>
                  </div>
                )}
                <Field
                  label="Kanal ID yoki @username"
                  hint="Botingizni shu kanalga ADMIN qiling. Masalan: -1001234567890 yoki @mychannel"
                >
                  <Input
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="-1001234567890"
                    className="font-mono"
                  />
                </Field>
                <Button loading={saveChannel.isPending} onClick={() => saveChannel.mutate()}>
                  Kanalni saqlash
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        {/* Yangi e'lon */}
        <Card>
          <CardHeader title="Yangi e'lon" />
          <CardBody className="space-y-3">
            <Field label="Matn">
              <Textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="E'lon matni… (HTML qo'llab-quvvatlanadi: <b>, <i>)"
              />
            </Field>

            <Field label="Rasm (ixtiyoriy)">
              {imageUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="post" className="h-28 rounded-xl object-cover border border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 h-6 w-6 grid place-items-center rounded-full bg-[var(--color-danger)] text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 h-14 px-3 rounded-xl border border-dashed border-[var(--color-border)] bg-white cursor-pointer w-fit">
                  <span className="inline-flex h-9 w-9 rounded-lg bg-[var(--color-bg)] items-center justify-center text-[var(--color-text-muted)]">
                    <Upload size={18} />
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)] pr-2">
                    {uploading ? 'Yuklanmoqda…' : 'Rasm yuklash'}
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => uploadImg(e.target.files?.[0])}
                  />
                </label>
              )}
            </Field>

            <label className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 cursor-pointer select-none hover:bg-[var(--color-bg)] transition-colors">
              <span className="inline-flex h-9 w-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] items-center justify-center shrink-0">
                <ShoppingBag size={17} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">&quot;Sotib olish&quot; tugmasi</span>
                <span className="block text-[11px] text-[var(--color-text-muted)]">Bosilganda do&apos;kon ochiladi</span>
              </span>
              <input
                type="checkbox"
                checked={buyButton}
                onChange={(e) => setBuyButton(e.target.checked)}
                className="h-5 w-5 accent-[var(--color-primary)] shrink-0"
              />
            </label>
            {buyButton && (
              <Field label="Tugma matni (ixtiyoriy)">
                <Input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="🛍 Sotib olish"
                />
              </Field>
            )}

            <label className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 cursor-pointer select-none hover:bg-[var(--color-bg)] transition-colors">
              <span className="inline-flex h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center shrink-0">
                <Send size={17} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">Hozir joylash</span>
                <span className="block text-[11px] text-[var(--color-text-muted)]">Darhol kanalga yuboriladi</span>
              </span>
              <input
                type="checkbox"
                checked={now}
                onChange={(e) => setNow(e.target.checked)}
                className="h-5 w-5 accent-[var(--color-primary)] shrink-0"
              />
            </label>
            {!now && (
              <Field label="Joylanadigan sana va vaqt">
                <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} min={nowLocalInput()} />
              </Field>
            )}

            <Button
              loading={create.isPending}
              disabled={!channelReady || text.trim().length < 1}
              onClick={() => create.mutate()}
            >
              <Send size={16} /> {now ? 'Hozir joylash' : "Rejaga qo'shish"}
            </Button>
            {!channelReady && (
              <p className="text-xs text-[var(--color-text-muted)]">
                E&apos;lon joylash uchun avval kanal va botni sozlang.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Ro'yxat */}
        <Card>
          <CardHeader title="E'lonlar" />
          <CardBody className="space-y-2">
            {!posts?.length ? (
              <p className="text-sm text-[var(--color-text-muted)] py-2 text-center">
                Hozircha e&apos;lonlar yo&apos;q
              </p>
            ) : (
              posts.map((p) => {
                const s = STATUS[p.status];
                return (
                  <div key={p.id} className="flex gap-3 rounded-xl border border-[var(--color-border)] p-3">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
                          <s.Icon size={12} /> {s.label}
                        </span>
                        {p.buyButton && <ShoppingBag size={13} className="text-[var(--color-primary)]" />}
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {new Date(p.scheduledAt).toLocaleString('ru-RU', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 break-words">{p.text}</p>
                      {p.status === 'FAILED' && p.error && (
                        <p className="text-[11px] text-[var(--color-danger)] mt-1">{p.error}</p>
                      )}
                    </div>
                    <button
                      onClick={() => del.mutate(p.id)}
                      className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-[var(--color-danger)] hover:bg-red-50"
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
