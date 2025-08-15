import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import type { Item, Category, CreateRequestInput } from '../../../server/src/schema';

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: number;
  onRequestCreated: () => void;
}

interface RequestItem {
  item_id: number;
  quantity: number;
  notes: string | null;
}

export function CreateRequestDialog({ open, onOpenChange, staffId, onRequestCreated }: CreateRequestDialogProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [justification, setJustification] = useState('');
  const [requestItems, setRequestItems] = useState<RequestItem[]>([
    { item_id: 0, quantity: 1, notes: null }
  ]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsData, categoriesData] = await Promise.all([
        trpc.getItems.query(),
        trpc.getCategories.query()
      ]);
      setItems(itemsData.filter(item => item.is_active));
      setCategories(categoriesData.filter(category => category.is_active));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate items
    const validItems = requestItems.filter(item => item.item_id > 0 && item.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one item to your request.');
      return;
    }

    try {
      setSubmitting(true);
      const requestData: CreateRequestInput = {
        staff_id: staffId,
        title,
        justification: justification || null,
        items: validItems.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
          notes: item.notes || null
        }))
      };

      await trpc.createRequest.mutate(requestData);
      
      // Reset form
      setTitle('');
      setJustification('');
      setRequestItems([{ item_id: 0, quantity: 1, notes: null }]);
      
      onRequestCreated();
    } catch (error) {
      console.error('Failed to create request:', error);
      alert('Failed to create request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = () => {
    setRequestItems([...requestItems, { item_id: 0, quantity: 1, notes: null }]);
  };

  const removeItem = (index: number) => {
    if (requestItems.length > 1) {
      setRequestItems(requestItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof RequestItem, value: any) => {
    const updatedItems = [...requestItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setRequestItems(updatedItems);
  };

  const getCategoryName = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return '';
    const category = categories.find(c => c.id === item.category_id);
    return category?.name || '';
  };

  const getItemsByCategory = () => {
    const itemsByCategory: Record<string, Item[]> = {};
    
    items.forEach(item => {
      const categoryName = getCategoryName(item.id) || 'Uncategorized';
      if (!itemsByCategory[categoryName]) {
        itemsByCategory[categoryName] = [];
      }
      itemsByCategory[categoryName].push(item);
    });

    return itemsByCategory;
  };

  const calculateEstimatedTotal = () => {
    return requestItems.reduce((total, requestItem) => {
      const item = items.find(i => i.id === requestItem.item_id);
      if (item && item.estimated_price) {
        return total + (item.estimated_price * requestItem.quantity);
      }
      return total;
    }, 0);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
            <DialogDescription>Loading items...</DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const itemsByCategory = getItemsByCategory();
  const estimatedTotal = calculateEstimatedTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>🛒 Create New Request</DialogTitle>
            <DialogDescription>
              Request office supplies and materials for your work
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Request Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="e.g., Office supplies for Q4 project"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJustification(e.target.value)}
                  placeholder="Explain why these items are needed (optional but recommended)"
                  rows={3}
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">📦 Request Items *</h3>
                <Button
                  type="button"
                  onClick={addItem}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {requestItems.map((requestItem, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      {/* Item Selection */}
                      <div className="col-span-5">
                        <Label htmlFor={`item-${index}`}>Item *</Label>
                        <Select
                          value={requestItem.item_id.toString()}
                          onValueChange={(value: string) => updateItem(index, 'item_id', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an item" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(itemsByCategory).map(([categoryName, categoryItems]) => (
                              <div key={categoryName}>
                                <div className="px-2 py-1 text-sm font-medium text-gray-500 bg-gray-100">
                                  {categoryName}
                                </div>
                                {categoryItems.map((item: Item) => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    <div className="flex justify-between items-center w-full">
                                      <span>{item.name}</span>
                                      {item.estimated_price && (
                                        <span className="text-xs text-gray-500 ml-2">
                                          ${item.estimated_price.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <Label htmlFor={`quantity-${index}`}>Quantity *</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={requestItem.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            updateItem(index, 'quantity', parseInt(e.target.value) || 1)
                          }
                          required
                        />
                      </div>

                      {/* Unit & Price Info */}
                      <div className="col-span-2">
                        {requestItem.item_id > 0 && (
                          <div className="text-sm text-gray-600">
                            {(() => {
                              const item = items.find(i => i.id === requestItem.item_id);
                              if (!item) return null;
                              return (
                                <div>
                                  <div>Unit: {item.unit}</div>
                                  {item.estimated_price && (
                                    <div className="text-green-600 font-medium">
                                      ${(item.estimated_price * requestItem.quantity).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="col-span-2">
                        <Label htmlFor={`notes-${index}`}>Notes</Label>
                        <Input
                          id={`notes-${index}`}
                          value={requestItem.notes || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            updateItem(index, 'notes', e.target.value || null)
                          }
                          placeholder="Optional"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1">
                        <Button
                          type="button"
                          onClick={() => removeItem(index)}
                          size="sm"
                          variant="outline"
                          disabled={requestItems.length === 1}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Estimate */}
              {estimatedTotal > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Estimated Total:</span>
                    <Badge className="text-lg px-3 py-1 bg-green-100 text-green-800">
                      ${estimatedTotal.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    This is an estimate based on catalog prices. Actual costs may vary.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || title.trim() === '' || requestItems.filter(i => i.item_id > 0).length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}