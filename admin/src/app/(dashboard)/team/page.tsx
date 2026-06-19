'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Pencil, Eye, Trash2, UserPlus, Info, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiTeam, apiAddMember, apiUpdateMemberRole, apiRemoveMember } from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';

const ROLE_INFO: Record<string, { label: string; desc: string; cls: string; Icon: typeof Crown }> = {
  SUPERADMIN: { label: 'Super admin', desc: 'Platforma boshqaruvi', cls: 'bg-purple-50 text-purple-600', Icon: ShieldCheck },
  ADMIN: { label: 'Egasi', desc: "Hamma narsa — sozlama, to'lov, jamoa", cls: 'bg-amber-50 text-amber-600', Icon: Crown },
  CREATOR: { label: 'Creator', desc: "Tovar, kategoriya, banner, e'lon qo'shadi", cls: 'bg-blue-50 text-blue-600', Icon: Pencil },
  MODERATOR: { label: 'Moderator', desc: "Do'konni kuzatadi, buyurtmalarni boshqaradi", cls: 'bg-emerald-50 text-emerald-600', Icon: Eye },
  MANAGER: { label: 'Manager', desc: 'Buyurtmalarni boshqaradi', cls: 'bg-gray-100 text-gray-600', Icon: Eye },
};

const LEGEND_ROLES = ['ADMIN', 'CREATOR', 'MODERATOR'] as const;

export default function TeamPage() {
  const qc = useQueryClient();
  const { data: team, isLoading } = useQuery({ queryKey: ['team'], queryFn: apiTeam });

  const [telegramId, setTelegramId] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'CREATOR' | 'MODERATOR'>('CREATOR');

  const add = useMutation({
    mutationFn: () => apiAddMember({ telegramId: telegramId.trim(), fullName: fullName.trim(), role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      setTelegramId('');
      setFullName('');
      toast.success('Xodim qo\'shildi');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, r }: { id: string; r: 'CREATOR' | 'MODERATOR' }) => apiUpdateMemberRole(id, r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Rol o\'zgartirildi');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiRemoveMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Xodim chiqarildi');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="pb-10">
      <PageHeader title="Jamoa" description="Do'koningizga xodimlar qo'shing va rollarni belgilang" />

      <div className="w-full md:max-w-2xl md:mx-auto space-y-3">
        {/* Rollar haqida */}
        <Card>
          <CardHeader title="Rollar" />
          <CardBody className="divide-y divide-[var(--color-border)] py-0">
            {LEGEND_ROLES.map((k) => {
              const r = ROLE_INFO[k];
              return (
                <div key={k} className="flex items-center gap-3 py-3 first:pt-3 last:pb-3">
                  <span className={`inline-flex h-10 w-10 rounded-xl items-center justify-center shrink-0 ${r.cls}`}>
                    <r.Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{r.label}</p>
                    <p className="text-[12px] text-[var(--color-text-muted)] leading-snug">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Xodim qo'shish */}
        <Card>
          <CardHeader title="Xodim qo'shish" />
          <CardBody className="space-y-3">
            <div className="flex gap-2 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-3 py-2.5 text-xs">
              <Info size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <p className="text-[var(--color-text-muted)]">
                Xodim <b>@selliostorebot</b> ga <b>/id</b> deb yozib o&apos;z Telegram ID sini biladi va sizga
                yuboradi. So&apos;ng u botdan panelга kirsa — o&apos;sha do&apos;konni ko&apos;radi.
              </p>
            </div>
            <Field label="Xodim Telegram ID">
              <Input
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="123456789"
                inputMode="numeric"
                className="font-mono"
              />
            </Field>
            <Field label="Ism">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ism familiya" />
            </Field>
            <Field label="Rol">
              <Select value={role} onChange={(e) => setRole(e.target.value as 'CREATOR' | 'MODERATOR')}>
                <option value="CREATOR">Creator — tovar qo&apos;shadi</option>
                <option value="MODERATOR">Moderator — kuzatadi</option>
              </Select>
            </Field>
            <Button
              loading={add.isPending}
              disabled={telegramId.trim().length < 5 || fullName.trim().length < 2}
              onClick={() => add.mutate()}
            >
              <UserPlus size={16} /> Qo&apos;shish
            </Button>
          </CardBody>
        </Card>

        {/* Jamoa ro'yxati */}
        <Card>
          <CardHeader title="Jamoa a'zolari" />
          <CardBody className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-16" />
            ) : (
              team?.map((m) => {
                const info = ROLE_INFO[m.role] ?? ROLE_INFO.MODERATOR;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-3">
                    <span className="relative shrink-0">
                      {m.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.photoUrl}
                          alt={m.fullName}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-[var(--color-border)]"
                        />
                      ) : (
                        <span className={`inline-flex h-11 w-11 rounded-full items-center justify-center font-semibold ${info.cls}`}>
                          {m.fullName.trim().slice(0, 1).toUpperCase() || '?'}
                        </span>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 rounded-full items-center justify-center ring-2 ring-white ${info.cls}`}>
                        <info.Icon size={11} />
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.fullName} {m.isSelf && <span className="text-[var(--color-text-muted)]">(siz)</span>}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {info.label} · ID {m.telegramId ?? '—'}
                      </p>
                    </div>
                    {m.isOwner ? (
                      <span className="text-[11px] font-semibold text-amber-600 shrink-0">Egasi</span>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={m.role === 'MODERATOR' ? 'MODERATOR' : 'CREATOR'}
                          onChange={(e) => changeRole.mutate({ id: m.id, r: e.target.value as 'CREATOR' | 'MODERATOR' })}
                          className="h-8 rounded-lg border border-[var(--color-border)] text-xs px-1.5 bg-white"
                        >
                          <option value="CREATOR">Creator</option>
                          <option value="MODERATOR">Moderator</option>
                        </select>
                        <button
                          onClick={() => remove.mutate(m.id)}
                          className="h-8 w-8 grid place-items-center rounded-lg text-[var(--color-danger)] hover:bg-red-50"
                          title="Chiqarish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {!isLoading && !team?.length && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-2">Hozircha jamoa bo&apos;sh</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
