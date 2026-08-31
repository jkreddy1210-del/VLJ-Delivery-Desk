import React, { createContext, useContext, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type SaveHandler = () => Promise<void> | void;

type UnsavedContextValue = {
  isDirty: boolean;
  setDirty: (v: boolean) => void;
  registerSaveHandler: (fn: SaveHandler | null) => void;
  requestNavigation: (href: string) => Promise<void>;
};

const UnsavedContext = createContext<UnsavedContextValue | undefined>(undefined);

export function UnsavedProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isDirty, setIsDirty] = useState(false);
  const saveHandlerRef = useRef<SaveHandler | null>(null);
  const pendingRef = useRef<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const registerSaveHandler = (fn: SaveHandler | null) => {
    saveHandlerRef.current = fn;
  };

  const setDirty = (v: boolean) => setIsDirty(v);

  const requestNavigation = async (href: string) => {
    if (!isDirty) {
      navigate({ to: href });
      return;
    }
    // show app modal instead of native confirm
    pendingRef.current = href;
    setModalOpen(true);
    return;
  };

  const handleSaveAndNavigate = async () => {
    setModalOpen(false);
    const href = pendingRef.current;
    try {
      if (saveHandlerRef.current) await saveHandlerRef.current();
    } catch (err) {
      // abort navigation on save failure
      pendingRef.current = null;
      return;
    }
    setIsDirty(false);
    pendingRef.current = null;
    if (href) navigate({ to: href });
  };

  const handleDiscard = () => {
    const href = pendingRef.current;
    setModalOpen(false);
    setIsDirty(false);
    pendingRef.current = null;
    if (href) navigate({ to: href });
  };

  const handleCancel = () => {
    pendingRef.current = null;
    setModalOpen(false);
  };

  return (
    <UnsavedContext.Provider value={{ isDirty, setDirty, registerSaveHandler, requestNavigation }}>
      {children}

      <AlertDialog open={modalOpen} onOpenChange={(open) => setModalOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>

            <AlertDialogDescription>
              You have unsaved changes. Save before leaving, discard changes, or cancel navigation.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>

            <AlertDialogAction onClick={() => handleDiscard()}>Discard changes</AlertDialogAction>

            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await handleSaveAndNavigate();
              }}
            >
              Save and continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedContext.Provider>
  );
}

export function useUnsaved() {
  const ctx = useContext(UnsavedContext);
  if (!ctx) throw new Error("useUnsaved must be used within UnsavedProvider");
  return ctx;
}
