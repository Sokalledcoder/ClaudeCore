import { FileCode, Plus, Shield, ShieldAlert, FolderOpen, User } from 'lucide-react';
import { useAppStore } from '../../stores/app.store';
import { cn } from '../../lib/utils';

export function SkillsPanel() {
  const { skills, currentWorkspace } = useAppStore();

  const userSkills = skills.filter(s => s.scope === 'user');
  const projectSkills = skills.filter(s => s.scope === 'project');

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <FileCode className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground">Skills</h3>
        <button className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {projectSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 mb-2">
            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Project Skills</span>
          </div>
          <div className="space-y-1">
            {projectSkills.map((skill) => (
              <button
                key={skill.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary text-left"
              >
                <FileCode className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{skill.name}</span>
                    {skill.trusted ? (
                      <Shield className="w-3 h-3 text-green-400 flex-shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {userSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 mb-2">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">User Skills</span>
          </div>
          <div className="space-y-1">
            {userSkills.map((skill) => (
              <button
                key={skill.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary text-left"
              >
                <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{skill.name}</span>
                    {skill.trusted ? (
                      <Shield className="w-3 h-3 text-green-400 flex-shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {skills.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileCode className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No skills found</p>
          <p className="text-xs mt-1">Create a skill or scan the workspace</p>
        </div>
      )}
    </div>
  );
}
