import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  title: string
  description?: string
  certificate_url?: string
  status: string
  blockchain_network?: string
  blockchain_hash?: string
  token_id?: string
  issued_at: string
  created_at: string
}

class CertificatesService {
  private handleError(context: string, error: unknown): never {
    console.error(`${context} failed:`, error)
    throw error instanceof Error ? error : new Error(`${context} failed due to an unexpected error`)
  }

  async getMyCertificates(signal?: AbortSignal): Promise<Certificate[]> {
    try {
      return await apiClient.get<Certificate[]>(API_ENDPOINTS.myCertificates, { signal })
    } catch (error) {
      this.handleError("Get certificates", error)
    }
  }

  async getCertificate(id: string, signal?: AbortSignal): Promise<Certificate> {
    try {
      return await apiClient.get<Certificate>(`${API_ENDPOINTS.certificates}/${id}`, { signal })
    } catch (error) {
      this.handleError("Get certificate", error)
    }
  }
}

export const certificatesService = new CertificatesService()
