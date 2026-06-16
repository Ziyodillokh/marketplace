'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { Field, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiAdminCategoriesTree,
  apiCreateRelatedRule,
  apiDeleteRelatedRule,
  apiListRelatedRules,
} from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';
import type { AdminCategoryNode } from '@/lib/types';

function flatten(nodes: AdminCategoryNode[], depth = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: '— '.repeat(depth) + n.titleUz });
    out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

export default function RelatedRulesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['related-rules'], queryFn: () => apiListRelatedRules({}) });
  const { data: cats } = useQuery({ queryKey: ['categories', 'tree'], queryFn: apiAdminCategoriesTree });

  const [open, setOpen] = useState(false);
  const [sourceCategoryId, setSourceCategoryId] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState('');

  const create = useMutation({
    mutationFn: () => apiCreateRelatedRule({ sourceCategoryId, targetCategoryId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['related-rules'] });
      setOpen(false);
      setSourceCategoryId('');
      setTargetCategoryId('');
      toast.success('Yaratildi');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDeleteRelatedRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['related-rules'] }),
  });

  const flat = cats ? flatten(cats) : [];

  return (
    <div>
      <PageHeader
        title="Bog'liq qoidalar"
        description="Kategoriya bo'yicha bog'liq mahsulotlar"
        rightSlot={<Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> Yangi</Button>}
      />

      {isLoading || !data ? (
        <Skeleton className="h-40" />
      ) : data.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
            Hozircha qoidalar yo&apos;q. Foydalanuvchiga mahsulotning yonida related mahsulotlar ko&apos;rsatish uchun qoida qo&apos;shing.
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--color-border)]">
            {data.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-medium">
                  {r.sourceCategory?.titleUz ?? r.sourceProduct?.titleUz ?? '?'}
                </span>
                <ArrowRight size={14} className="text-[var(--color-text-muted)]" />
                <span className="text-sm font-medium flex-1">
                  {r.targetCategory?.titleUz ?? r.targetProduct?.titleUz ?? '?'}
                </span>
                <button
                  onClick={() => {
                    if (confirm("O'chirilsinmi?")) remove.mutate(r.id);
                  }}
                  className="h-8 w-8 grid place-items-center text-[var(--color-danger)] hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Yangi related rule">
        <div className="space-y-3">
          <Field label="Manba kategoriya">
            <Select value={sourceCategoryId} onChange={(e) => setSourceCategoryId(e.target.value)}>
              <option value="">Tanlang</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Maqsadli kategoriya">
            <Select value={targetCategoryId} onChange={(e) => setTargetCategoryId(e.target.value)}>
              <option value="">Tanlang</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            fullWidth
            disabled={!sourceCategoryId || !targetCategoryId}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Saqlash
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
