import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { ErrorState } from '@/components/shared/error-state';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  useUpdateCurrentUserPreferencesMutation,
} from '@/features/preferences/api/user-preferences-api';

const EMPTY_HIDDEN_WIDGET_IDS = Object.freeze([]);

function DashboardDisplayPreferences({ accessibleWidgets, preferencesQuery }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draftHiddenWidgetIds, setDraftHiddenWidgetIds] = useState(() => new Set());
  const [updatePreferences, { isLoading: isSaving }] =
    useUpdateCurrentUserPreferencesMutation();
  const configurableWidgets = accessibleWidgets.filter((widget) => widget.configurable);
  const savedHiddenWidgetIds = preferencesQuery.data?.dashboard?.hiddenWidgetIds
    ?? EMPTY_HIDDEN_WIDGET_IDS;

  useEffect(() => {
    if (!open) return;
    setDraftHiddenWidgetIds(new Set(savedHiddenWidgetIds));
  }, [open, savedHiddenWidgetIds]);

  if (configurableWidgets.length === 0) return null;

  function updateWidgetVisibility(widgetId, visible) {
    setDraftHiddenWidgetIds((current) => {
      const next = new Set(current);

      if (visible) {
        next.delete(widgetId);
      } else {
        next.add(widgetId);
      }

      return next;
    });
  }

  async function savePreferences() {
    try {
      await updatePreferences({
        dashboard: {
          hiddenWidgetIds: [...draftHiddenWidgetIds].sort(),
        },
      }).unwrap();

      setOpen(false);
      toast({
        title: 'Affichage du tableau de bord enregistré',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Enregistrement impossible',
        description: error?.data?.message
          ?? 'Impossible d’enregistrer vos préférences d’affichage.',
        variant: 'error',
      });
    }
  }

  return (
    <>
      <Button
        disabled={preferencesQuery.isLoading}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Personnaliser le tableau de bord
      </Button>

      <EntityDetailsDrawer
        description="Choisissez uniquement parmi les indicateurs auxquels vous avez réellement accès dans ce workspace. Masquer un indicateur ne modifie jamais vos droits."
        onClose={() => setOpen(false)}
        open={open}
        title="Affichage du tableau de bord"
      >
        {preferencesQuery.isError ? (
          <ErrorState
            description="Vos préférences d’affichage n’ont pas pu être récupérées."
            onRetry={() => preferencesQuery.refetch()}
            title="Impossible de charger les préférences"
          />
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {configurableWidgets.map((widget) => {
                const isVisible = !draftHiddenWidgetIds.has(widget.id);

                return (
                  <div
                    className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                    key={widget.id}
                  >
                    <div className="min-w-0 space-y-1">
                      <label
                        className="text-sm font-medium"
                        htmlFor={`dashboard-widget-${widget.id}`}
                      >
                        {widget.label}
                      </label>
                      {widget.description && (
                        <p className="text-sm text-muted-foreground">
                          {widget.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      aria-label={`Afficher ${widget.label}`}
                      checked={isVisible}
                      disabled={isSaving}
                      id={`dashboard-widget-${widget.id}`}
                      onCheckedChange={(checked) => updateWidgetVisibility(
                        widget.id,
                        checked,
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              <Button
                disabled={isSaving}
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Annuler
              </Button>
              <Button
                disabled={isSaving || preferencesQuery.data === undefined}
                onClick={savePreferences}
                type="button"
              >
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
      </EntityDetailsDrawer>
    </>
  );
}

export { DashboardDisplayPreferences };
