import { useViewStore } from '../../store/viewStore';

interface NPCLinkProps {
  name: string;
  id?: string;
}

export function NPCLink({ name, id }: NPCLinkProps) {
  const { selectNPC } = useViewStore();

  const handleClick = async () => {
    try {
      // Try to fetch NPC by ID or name
      const npcId = id || name.toLowerCase().replace(/\s+/g, '_');
      const response = await fetch(`/api/npcs/${npcId}`);
      if (response.ok) {
        const npc = await response.json();
        selectNPC(npc);
      } else {
        console.warn(`NPC not found: ${name}`);
      }
    } catch (error) {
      console.error('Failed to load NPC:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
    >
      [{name}]
    </button>
  );
}
