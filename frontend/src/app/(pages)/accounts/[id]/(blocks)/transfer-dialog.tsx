'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@/components';
import type { IAccount } from '@/interfaces';

interface TransferDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account: IAccount | null;
  myAccounts: IAccount[];
  selectedSenderAccountId: string;
  setSelectedSenderAccountId: (value: string) => void;
  transferAmount: string;
  setTransferAmount: (value: string) => void;
  isTransferring: boolean;
  onTransfer: () => void;
}

export function TransferDialog({
  isOpen,
  onOpenChange,
  account,
  myAccounts,
  selectedSenderAccountId,
  setSelectedSenderAccountId,
  transferAmount,
  setTransferAmount,
  isTransferring,
  onTransfer,
}: TransferDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>
            Transfer {account?.currency} to account {account?.id}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Select your account to transfer from:</Label>
            <RadioGroup
              value={selectedSenderAccountId}
              onValueChange={setSelectedSenderAccountId}
            >
              {myAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={acc.id} id={acc.id} />
                  <Label
                    htmlFor={acc.id}
                    className="font-normal cursor-pointer"
                  >
                    <span className="font-mono text-xs">
                      {acc.id.slice(0, 8)}...
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      Balance: {acc.balance} {acc.currency}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount ({account?.currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter amount"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isTransferring}
          >
            Cancel
          </Button>
          <Button
            onClick={onTransfer}
            disabled={
              isTransferring || !transferAmount || !selectedSenderAccountId
            }
          >
            {isTransferring ? 'Transferring...' : 'Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
