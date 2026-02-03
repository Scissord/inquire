"use client";

import { Button } from "@/components"
import { useConfirmationStore, useNotificationStore } from "@/store";

export const Header = () => {
  const confirmationStore = useConfirmationStore.getState();
  const notificationStore = useNotificationStore.getState();

  return (
    <header className="flex items-center justify-between">
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        User management
      </h1>

      <Button
        variant="default"
        onClick={() => {
        confirmationStore.openConfirmation({
          title: "Delete Confirmation",
          description: "Are you sure you want to delete this item?",
          cancelLabel: "Cancel",
          actionLabel: "Delete",
          onAction: () => { },
          onCancel: () => { },
        });
      }}>
        Delete Item
      </Button>

      <Button
        variant="default"
        onClick={() => {
        notificationStore.addNotification({
          type: "default",
          title: "Успех!",
          description: "Пользователь успешно сохранён.",
        });
      }}>
        Make Notification
      </Button>

      {/* <Dialog>
        <form>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you&apos;re
                done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="name-1">Name</Label>
                <Input id="name-1" name="name" defaultValue="Pedro Duarte" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="username-1">Username</Label>
                <Input id="username-1" name="username" defaultValue="@peduarte" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog> */}
    </header>
  )
}