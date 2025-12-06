import { ArrowLeft } from 'lucide-react';
import { useViewStore } from '../../store/viewStore';
import type { Item } from '../../types';
import { Section } from '../shared/Section';

interface ItemDetailViewProps {
  item: Item;
}

export function ItemDetailView({ item }: ItemDetailViewProps) {
  const { popView } = useViewStore();

  return (
    <div className="space-y-4">
      {/* Header */}
      <button
        onClick={popView}
        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
      >
        <ArrowLeft size={16} /> Back to Scene
      </button>

      <header className="border-b border-neutral-700 pb-4">
        <h2 className="text-2xl font-bold">{item.name}</h2>
        <p className="text-neutral-400">{item.type}</p>
        {item.value && (
          <p className="text-amber-400 font-mono">{item.value}</p>
        )}
      </header>

      <Section title="Description">
        <p className="text-neutral-300">{item.description}</p>
      </Section>

      {item.properties && Object.keys(item.properties).length > 0 && (
        <Section title="Properties">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(item.properties).map(([key, value]) => (
              <div key={key}>
                <dt className="text-neutral-400 capitalize">{key}</dt>
                <dd className="text-neutral-200">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {item.notes && (
        <Section title="GM Notes">
          <p className="text-neutral-300 text-sm">{item.notes}</p>
        </Section>
      )}
    </div>
  );
}
