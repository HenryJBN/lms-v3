import { apiClient } from "@/lib/api-client"
import { API_ENDPOINTS } from "../api-config"

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  parent_id?: string
  sort_order?: number
  is_active?: boolean
  course_count?: number
  created_at?: string
  updated_at?: string
}

export interface CategoriesResponse {
  items: Category[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Mock categories as fallback
const MOCK_CATEGORIES: Category[] = [
  {
    id: "blockchain",
    name: "Blockchain & Crypto",
    slug: "blockchain",
    description: "Learn blockchain technology and cryptocurrency",
    course_count: 12,
  },
  {
    id: "ai",
    name: "AI & Machine Learning",
    slug: "ai",
    description: "Artificial intelligence and machine learning courses",
    course_count: 18,
  },
  {
    id: "web-dev",
    name: "Web Development",
    slug: "web-dev",
    description: "Full-stack web development courses",
    course_count: 24,
  },
  {
    id: "filmmaking",
    name: "Filmmaking",
    slug: "filmmaking",
    description: "Film production and cinematography",
    course_count: 15,
  },
  {
    id: "3d-animation",
    name: "3D Animation",
    slug: "3d-animation",
    description: "3D modeling and animation",
    course_count: 10,
  },
  {
    id: "business",
    name: "Business & Finance",
    slug: "business",
    description: "Business strategy and financial management",
    course_count: 8,
  },
]

class CategoryService {
  private useMockData = false // Set to false when backend is ready

  async getCategories(params?: {
    page?: number
    page_size?: number
    search?: string
  }): Promise<Category[]> {
    // Use mock data if enabled or if API call fails
    if (this.useMockData) {
      return Promise.resolve(MOCK_CATEGORIES)
    }

    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append("page", params.page.toString())
      if (params?.page_size) queryParams.append("page_size", params.page_size.toString())
      if (params?.search) queryParams.append("search", params.search)

      const url = `${API_ENDPOINTS.categories}${queryParams.toString() ? "?" + queryParams.toString() : ""}`
      const response = await apiClient.get<CategoriesResponse>(url)

      return response.items || []
    } catch (error) {
      console.warn("Failed to fetch categories from API, using mock data:", error)
      // Fallback to mock data on error
      return MOCK_CATEGORIES
    }
  }

  async getCategoryById(id: string): Promise<Category | null> {
    if (this.useMockData) {
      const category = categoryService.getCategoryById(id)
      return Promise.resolve(category || null)
    }

    try {
      const response = await apiClient.get<Category>(`${API_ENDPOINTS.categories}/${id}`)
      return response
    } catch (error) {
      console.warn(`Failed to fetch category ${id} from API, using mock data:`, error)
      const category = MOCK_CATEGORIES.find((c) => c.id === id)
      return category || null
    }
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    if (this.useMockData) {
      const category = MOCK_CATEGORIES.find((c) => c.slug === slug)
      return Promise.resolve(category || null)
    }

    try {
      const response = await apiClient.get<Category>(`${API_ENDPOINTS.categories}/slug/${slug}`)
      return response
    } catch (error) {
      console.warn(`Failed to fetch category by slug ${slug} from API, using mock data:`, error)
      const category = MOCK_CATEGORIES.find((c) => c.slug === slug)
      return category || null
    }
  }

  async createCategory(data: {
    name: string
    slug: string
    description?: string
    icon?: string
    color?: string
    parent_id?: string
    sort_order?: number
    is_active?: boolean
  }): Promise<Category> {
    if (this.useMockData) {
      const newCategory: Category = {
        id: Date.now().toString(),
        ...data,
        course_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return Promise.resolve(newCategory)
    }

    try {
      const response = await apiClient.post<Category>(API_ENDPOINTS.categories, data)
      return response
    } catch (error) {
      console.error("Failed to create category:", error)
      throw error
    }
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    if (this.useMockData) {
      const category = MOCK_CATEGORIES.find((c) => c.id === id)
      if (!category) {
        throw new Error("Category not found")
      }
      return Promise.resolve({
        ...category,
        ...data,
        updated_at: new Date().toISOString(),
      })
    }

    try {
      const response = await apiClient.put<Category>(`${API_ENDPOINTS.categories}/${id}`, data)
      return response
    } catch (error) {
      console.error(`Failed to update category ${id}:`, error)
      throw error
    }
  }

  async deleteCategory(id: string): Promise<void> {
    if (this.useMockData) {
      return Promise.resolve()
    }

    try {
      await apiClient.delete(`${API_ENDPOINTS.categories}/${id}`)
    } catch (error) {
      console.error(`Failed to delete category ${id}:`, error)
      throw error
    }
  }

  // Method to toggle between mock and real API
  setUseMockData(useMock: boolean) {
    this.useMockData = useMock
  }

  // Method to get mock categories directly
  getMockCategories(): Category[] {
    return MOCK_CATEGORIES
  }

  async getAllCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>(`${API_ENDPOINTS.categories}`)
  }
}

export const categoryService = new CategoryService()
