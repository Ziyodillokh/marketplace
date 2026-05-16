'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiAdminCategoriesTree, apiCreateCategory, apiDeleteCategory, apiUpdateCategory } from '@/lib/endpoints';
import type { AdminCategoryNode } from '@/lib/types';
import { toast } from '@/stores/toast-store';

interface FormData {
  titleUz: string;
  titleRu: string;
  iconUrl: string;
  bannerUrl: string;
  isVisible: boolean;
  parentId: string | null;
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['categories', 'tree'], queryFn: apiAdminCategoriesTree });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategoryNode | null>(null);
  const [parentForCreate, setParentForCreate] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    titleUz: '',
    titleRu: '',
    iconUrl: '',
    bannerUrl: '',
    isVisible: true,
    parentId: null,
  });

  const openCreate = (parentId: string | null) => {
    setEditing(null);
    setParentForCreate(parentId);
    setForm({ titleUz: '', titleRu: '', iconUrl: '', bannerUrl: '', isVisible: true, parentId });
    setSheetOpen(true);
  };
  const openEdit = (c: AdminCategoryNode) => {
    setEditing(c);
    setForm({
      titleUz: c.titleUz,
      titleRu: c.titleRu,
      iconUrl: c.iconUrl ?? '',
      bannerUrl: c.bannerUrl ?? '',
      isVisible: c.isVisible,
      parentId: c.parentId,
    });
    setSheetOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? apiUpdateCategory(editing.id, {
            titleUz: form.titleUz,
            titleRu: form.titleRu || form.titleUz,
            iconUrl: form.iconUrl || null,
            bannerUrl: form.bannerUrl || null,
            isVisible: form.isVisible,
          })
        : apiCreateCategory({
            titleUz: form.titleUz,
            titleRu: form.titleRu || form.titleUz,
            iconUrl: form.iconUrl || null,
            bannerUrl: form.bannerUrl || null,
            isVisible: form.isVisible,
            parentId: parentForCreate ?? undefined,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', 'tree'] });
      toast.success('Saqlandi');
      setSheetOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', 'tree'] });
      toast.success("O'chirildi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Kategoriyalar"
        rightSlot={
          <Button size="sm" onClick={() => openCreate(null)}>
            <Plus size={16} /> Yangi
          </Button>
        }
      />
      {isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : data.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">Kategoriyalar yo&apos;q</div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[var(--color-border)]">
            {data.map((c) => (
              <CategoryRow
                key={c.id}
                node={c}
                depth={0}
                onEdit={openEdit}
                onAddChild={(id) => openCreate(id)}
                onDelete={(id) => {
                  if (confirm("O'chirilsinmi?")) deleteMutation.mutate(id);
                }}
              />
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? "Tahrirlash" : "Yangi kategoriya"}>
        <div className="space-y-3">
          <Field label="Nomi (uz)">
            <Input value={form.titleUz} onChange={(e) => setForm({ ...form, titleUz: e.target.value })} />
          </Field>
          <Field label="Nomi (ru)">
            <Input value={form.titleRu} onChange={(e) => setForm({ ...form, titleRu: e.target.value })} />
          </Field>
          <Field label="Icon URL">
            <Input value={form.iconUrl} onChange={(e) => setForm({ ...form, iconUrl: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Banner URL">
            <Input value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} />
          </Field>
          <label className="flex items-center justify-between text-sm">
            <span>Ko&apos;rsatish</span>
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-gray-200 checked:bg-[var(--color-primary)] relative cursor-pointer transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
            />
          </label>
          <Button fullWidth loading={saveMutation.isPending} disabled={!form.titleUz} onClick={() => saveMutation.mutate()}>
            Saqlash
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function CategoryRow({
  node,
  depth,
  onEdit,
  onAddChild,
  onDelete,
}: {
  node: AdminCategoryNode;
  depth: number;
  onEdit: (n: AdminCategoryNode) => void;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <>
      <li className="px-4 py-3 flex items-center gap-2" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="h-6 w-6 grid place-items-center text-[var(--color-text-muted)]"
        >
          {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </button>
        <span className="flex-1 text-sm font-medium truncate">{node.titleUz}</span>
        {!node.isVisible && <Badge tone="gray">Yashirin</Badge>}
        <span className="text-xs text-[var(--color-text-muted)]">{node.productsCount} mahsulot</span>
        <button onClick={() => onAddChild(node.id)} className="h-8 w-8 grid place-items-center text-[var(--color-text-muted)] hover:bg-gray-50 rounded-lg">
          <Plus size={14} />
        </button>
        <button onClick={() => onEdit(node)} className="h-8 w-8 grid place-items-center text-[var(--color-text-muted)] hover:bg-gray-50 rounded-lg">
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(node.id)} className="h-8 w-8 grid place-items-center text-[var(--color-danger)] hover:bg-rose-50 rounded-lg">
          <Trash2 size={14} />
        </button>
      </li>
      {expanded && node.children.map((c) => (
        <CategoryRow key={c.id} node={c} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} onDelete={onDelete} />
      ))}
    </>
  );
}
