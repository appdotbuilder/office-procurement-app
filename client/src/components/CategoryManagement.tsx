import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Package } from 'lucide-react';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../server/src/schema';

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: '',
    description: null
  });

  // Update form state
  const [updateFormData, setUpdateFormData] = useState<UpdateCategoryInput>({
    id: 0,
    name: '',
    description: null,
    is_active: true
  });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await trpc.getCategories.query();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const newCategory = await trpc.createCategory.mutate(formData);
      setCategories((prev: Category[]) => [...prev, newCategory]);
      setFormData({ name: '', description: null });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      setSubmitting(true);
      const updatedCategory = await trpc.updateCategory.mutate(updateFormData);
      setCategories((prev: Category[]) => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
      setEditingCategory(null);
      setUpdateFormData({ id: 0, name: '', description: null, is_active: true });
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setUpdateFormData({
      id: category.id,
      name: category.name,
      description: category.description,
      is_active: category.is_active
    });
  };

  const getCategoryIcon = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('office')) return '🏢';
    if (lowercaseName.includes('computer') || lowercaseName.includes('tech')) return '💻';
    if (lowercaseName.includes('furniture')) return '🪑';
    if (lowercaseName.includes('supply') || lowercaseName.includes('supplies')) return '📝';
    if (lowercaseName.includes('clean')) return '🧽';
    if (lowercaseName.includes('kitchen') || lowercaseName.includes('food')) return '🍽️';
    return '📦';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏷️ Category Management</CardTitle>
          <CardDescription>Loading categories...</CardDescription>
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
            <CardTitle>🏷️ Category Management</CardTitle>
            <CardDescription>
              Organize procurement items into categories for better management
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateCategory}>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>
                    Add a new category to organize procurement items
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., Office Supplies, IT Equipment"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateCategoryInput) => ({ 
                          ...prev, 
                          description: e.target.value || null 
                        }))
                      }
                      placeholder="Optional description of what items belong in this category"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Category'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No categories found. Create your first category above!</p>
            <div className="text-sm text-gray-400">
              Categories help organize items like "Office Supplies", "IT Equipment", "Furniture", etc.
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category: Category) => (
              <div key={category.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getCategoryIcon(category.name)}</span>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!category.is_active && (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                        Inactive
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditCategory(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {category.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {category.description}
                  </p>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Created {category.created_at.toLocaleDateString()}</span>
                  <Badge variant={category.is_active ? "default" : "secondary"} className="text-xs">
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Category Dialog */}
        <Dialog open={editingCategory !== null} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent>
            <form onSubmit={handleUpdateCategory}>
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogDescription>
                  Update category information and status
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="update-name">Category Name</Label>
                  <Input
                    id="update-name"
                    value={updateFormData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData((prev: UpdateCategoryInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-description">Description</Label>
                  <Textarea
                    id="update-description"
                    value={updateFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setUpdateFormData((prev: UpdateCategoryInput) => ({ 
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
                      setUpdateFormData((prev: UpdateCategoryInput) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="update-active">Category is active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Category'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}