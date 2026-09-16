import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const DRAWER_TRANSITION_MS = 300;

/**
 * Panneau de détails latéral partagé pour les entités du Core.
 *
 * Les features fournissent uniquement leur contenu métier. La primitive Sheet
 * porte la mécanique transversale du panneau : Portal, focus modal, Escape,
 * restauration du focus et verrouillage du scroll.
 *
 * Le wrapper conserve toutefois la responsabilité de présence du panneau afin
 * de préserver le contrat historique : les données restent montées pendant la
 * transition de sortie avant le démontage final.
 *
 * Le texte explicatif reste disponible aux technologies d'assistance via la
 * description Base UI, mais n'encombre pas visuellement tous les drawers :
 * l'utilisateur le retrouve à la demande via le tooltip d'information commun.
 */
function EntityDetailsDrawer({ children, description, onClose, open, title }) {
  const closeButtonRef = useRef(null);
  const [isMounted, setIsMounted] = useState(open);
  const [isSheetOpen, setIsSheetOpen] = useState(open);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      ?? false;

    if (open && !isMounted) {
      // Monter d'abord le Sheet fermé permet à Base UI d'observer ensuite la
      // transition closed -> open au lieu d'afficher directement le panneau.
      setIsMounted(true);
      return undefined;
    }

    if (open) {
      if (reduceMotion) {
        setIsSheetOpen(true);
        return undefined;
      }

      if (typeof window.requestAnimationFrame !== 'function') {
        const timeoutId = window.setTimeout(() => {
          setIsSheetOpen(true);
        }, 0);

        return () => {
          window.clearTimeout(timeoutId);
        };
      }

      const frameId = window.requestAnimationFrame(() => {
        setIsSheetOpen(true);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    setIsSheetOpen(false);

    if (!isMounted) return undefined;

    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, reduceMotion ? 0 : DRAWER_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMounted, open]);

  if (!isMounted) return null;

  return (
    <Sheet
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={isSheetOpen}
    >
      <SheetContent
        className="inset-y-auto bottom-0 top-16 h-auto w-full max-w-xl min-w-0 transform-gpu overflow-hidden p-0 shadow-lg transition-transform duration-300 ease-in-out will-change-transform data-ending-style:translate-x-full data-ending-style:opacity-100 data-starting-style:translate-x-full data-starting-style:opacity-100"
        initialFocus={closeButtonRef}
        keepMounted
        overlayClassName="top-16 bg-overlay/45 duration-300 ease-in-out will-change-opacity"
        render={<aside />}
        side="right"
        showCloseButton={false}
      >
        <header className="flex min-w-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <SheetTitle className="text-lg font-semibold">
                {title}
              </SheetTitle>
              <InfoTooltip
                content={description}
                label={`À propos de ${title}`}
              />
            </div>
            {description && (
              <SheetDescription className="sr-only">
                {description}
              </SheetDescription>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger
              render={(
                <SheetClose
                  ref={closeButtonRef}
                  render={(
                    <Button
                      aria-label="Fermer"
                      className="shrink-0"
                      size="icon"
                      type="button"
                      variant="ghost"
                    />
                  )}
                />
              )}
            >
              <X aria-hidden="true" className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Fermer</TooltipContent>
          </Tooltip>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-5 [scrollbar-gutter:stable]">
          <div className="min-w-0 max-w-full">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { DRAWER_TRANSITION_MS, EntityDetailsDrawer };
