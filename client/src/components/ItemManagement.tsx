import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Package2, Search } from 'lucide-react';
import type { Item, Category, CreateItemInput, UpdateItemInput } from '../../../server/src/schema';

export function ItemManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<CreateItemInput>({
    name: '',
    description: null,
    category_id: 0,
    unit: '',
    estimated_price: null
  });

  // Update form state
  const [updateFormData, setUpdateFormData] = useState<UpdateItemInput>({
    id: 0,
    name: '',
    description: null,
    category_id: 0,
    unit: '',
    estimated_price: null,
    is_active: true
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsData, categoriesData] = await Promise.all([
        trpc.getItems.query(),
        trpc.getCategories.query()
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const newItem = await trpc.createItem.mutate(formData);
      setItems((prev: Item[]) => [...prev, newItem]);
      setFormData({
        name: '',
        description: null,
        category_id: 0,
        unit: '',
        estimated_price: null
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSubmitting(true);
      const updatedItem = await trpc.updateItem.mutate(updateFormData);
      setItems((prev: Item[]) => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
      setEditingItem(null);
      setUpdateFormData({
        id: 0,
        name: '',
        description: null,
        category_id: 0,
        unit: '',
        estimated_price: null,
        is_active: true
      });
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditItem = (item: Item) => {
    setEditingItem(item);
    setUpdateFormData({
      id: item.id,
      name: item.name,
      description: item.description,
      category_id: item.category_id,
      unit: item.unit,
      estimated_price: item.estimated_price,
      is_active: item.is_active
    });
  };

  const getItemIcon = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '📦';
    
    const lowercaseName = category.name.toLowerCase();
    if (lowercaseName.includes('office')) return '📝';
    if (lowercaseName.includes('computer') || lowercaseName.includes('tech')) return '💻';
    if (lowercaseName.includes('furniture')) return '🪑';
    if (lowercaseName.includes('clean')) return '🧽';
    if (lowercaseName.includes('kitchen') || lowercaseName.includes('food')) return '🍽️';
    return '📦';
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const filteredItems = items.filter((item: Item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📦 Item Management</CardTitle>
          <CardDescription>Loading items...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>📦 Item Management</CardTitle>
            <CardDescription>
              Manage the catalog of items available for procurement
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleCreateItem}>
                <DialogHeader>
                  <DialogTitle>Create New Item</DialogTitle>
                  <DialogDescription>
                    Add a new item to the procurement catalog
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateItemInput) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., A4 Paper, Wireless Mouse"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category_id.toString()}
                      onValueChange={(value: string) => 
                        setFormData((prev: CreateItemInput) => ({ ...prev, category_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => c.is_active).map((category: Category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateItemInput) => ({ ...prev, unit: e.target.value }))
                      }
                      placeholder="e.g., piece, box, pack"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Estimated Price (per unit)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.estimated_price || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateItemInput) => ({ 
                          ...prev, 
                          estimated_price: e.target.value ? parseFloat(e.target.value) : null 
                        }))
                      }
                      placeholder="Optional estimated price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateItemInput) => ({ 
                          ...prev, 
                          description: e.target.value || null 
                        }))
                      }
                      placeholder="Optional item description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !formData.category_id}>
                    {submitting ? 'Creating...' : 'Create Item'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter */}
        <div className="flex space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">
              {items.length === 0 
                ? "No items found. Create your first item above!" 
                : "No items match your search criteria."
              }
            </p>
            {items.length === 0 && (
              <div className="text-sm text-gray-400">
                Items are the products and supplies that can be requested by staff.
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item: Item) => (
              <div key={item.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getItemIcon(item.category_id)}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
                      <Badge variant="outline" className="text-xs mt-1">
                        {getCategoryName(item.category_id)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!item.is_active && (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                        Inactive
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditItem(item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Unit:</span>
                    <span className="font-medium">{item.unit}</span>
                  </div>
                  {item.estimated_price && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Est. Price:</span>
                      <span className="font-medium text-green-600">
                        ${item.estimated_price.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-2">
                  <span>Added {item.created_at.toLocaleDateString()}</span>
                  <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Item Dialog */}
        <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleUpdateItem}>
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
                <DialogDescription>
                  Update item information and status
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="update-name">Item Name</Label>
                  <Input
                    id="update-name"
                    value={updateFormData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData((prev: UpdateItemInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Item name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-category">Category</Label>
                  <Select 
                    value={updateFormData.category_id?.toString() || ''}
                    onValueChange={(value: string) => 
                      setUpdateFormData((prev: UpdateItemInput) => ({ ...prev, category_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.is_active).map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-unit">Unit</Label>
                  <Input
                    id="update-unit"
                    value={updateFormData.unit || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData((prev: UpdateItemInput) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder="Unit of measurement"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-price">Estimated Price (per unit)</Label>
                  <Input
                    id="update-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={updateFormData.estimated_price || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData((prev: UpdateItemInput) => ({ 
                        ...prev, 
                        estimated_price: e.target.value ? parseFloat(e.target.value) : null 
                      }))
                    }
                    placeholder="Optional estimated price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-description">Description</Label>
                  <Textarea
                    id="update-description"
                    value={updateFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setUpdateFormData((prev: UpdateItemInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="update-active"
                    checked={updateFormData.is_active || false}
                    onCheckedChange={(checked: boolean) =>
                      setUpdateFormData((prev: UpdateItemInput) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="update-active">Item is active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}