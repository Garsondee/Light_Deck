import { Target, Search, Upload } from 'lucide-react';
import { useViewStore } from '../../store/viewStore';
import { useSceneStore } from '../../store/sceneStore';

export function QuickActions() {
  const { openModal } = useViewStore();
  const { currentScene } = useSceneStore();

  const handleAdHocCheck = () => {
    openModal('adHocCheck');
  };

  const handleSearch = () => {
    openModal('globalSearch');
  };

  const handleExport = () => {
    if (!currentScene) return;
    
    // Create export data
    const exportData = {
      scene: currentScene,
      exportedAt: new Date().toISOString(),
    };
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    console.log('[GM] Scene exported to clipboard');
  };

  return (
    <div className="space-y-2">
      <h3 className="section-header">Quick Actions</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={<Target size={14} />}
          label="Ad-Hoc Check"
          onClick={handleAdHocCheck}
        />
        <ActionButton
          icon={<Search size={14} />}
          label="Search"
          shortcut="Cmd+K"
          onClick={handleSearch}
        />
        <ActionButton
          icon={<Upload size={14} />}
          label="Export"
          onClick={handleExport}
        />
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function ActionButton({ icon, label, shortcut, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={shortcut}
      className="btn btn-secondary flex items-center gap-1.5 justify-center text-xs"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
