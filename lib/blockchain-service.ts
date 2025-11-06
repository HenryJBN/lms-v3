// This is a mock service that would interact with a real blockchain in production
// Using ethers.js, web3.js, or a similar library

export interface LToken {
  balance: number
  transactionHistory: Transaction[]
}

export interface Transaction {
  id: string
  type: "earned" | "spent" | "received"
  amount: number
  timestamp: number
  description: string
}

export interface Certificate {
  id: string
  courseId: string
  courseTitle: string
  tokenId: string
  issueDate: number
  blockchain: string
  imageUrl: string
}

// Mock data
const mockTokenData: LToken = {
  balance: 120,
  transactionHistory: [
    {
      id: "1",
      type: "earned",
      amount: 25,
      timestamp: Date.now() - 3600000 * 24,
      description: "Completed Introduction to Blockchain lesson",
    },
    {
      id: "2",
      type: "earned",
      amount: 15,
      timestamp: Date.now() - 3600000 * 48,
      description: "Quiz: AI Fundamentals",
    },
    {
      id: "3",
      type: "spent",
      amount: 30,
      timestamp: Date.now() - 3600000 * 72,
      description: "Unlocked Premium Course: Advanced Smart Contracts",
    },
  ],
}

const mockCertificates: Certificate[] = [
  {
    id: "1",
    courseId: "html-css-101",
    courseTitle: "HTML & CSS Fundamentals",
    tokenId: "0x7298c31b8c08cE82a65Bd16E1F6A8459B0C90a55",
    issueDate: Date.now() - 3600000 * 24 * 30,
    blockchain: "Polygon",
    imageUrl: "/placeholder.svg?height=250&width=400",
  },
]

// Services
export const blockchainService = {
  // Token related functions
  getTokenBalance: async (): Promise<number> => {
    // In a real app, this would connect to the blockchain
    return mockTokenData.balance
  },

  getTransactionHistory: async (): Promise<Transaction[]> => {
    return mockTokenData.transactionHistory
  },

  spendTokens: async (amount: number, purpose: string): Promise<boolean> => {
    // Mock implementation
    if (amount <= mockTokenData.balance) {
      mockTokenData.balance -= amount
      mockTokenData.transactionHistory.unshift({
        id: Math.random().toString(36).substring(7),
        type: "spent",
        amount,
        timestamp: Date.now(),
        description: purpose,
      })
      return true
    }
    return false
  },

  earnTokens: async (amount: number, activity: string): Promise<boolean> => {
    // Mock implementation
    mockTokenData.balance += amount
    mockTokenData.transactionHistory.unshift({
      id: Math.random().toString(36).substring(7),
      type: "earned",
      amount,
      timestamp: Date.now(),
      description: activity,
    })
    return true
  },

  // Certificate related functions
  getCertificates: async (): Promise<Certificate[]> => {
    return mockCertificates
  },

  mintCertificate: async (courseId: string, courseTitle: string): Promise<Certificate> => {
    // Mock implementation of minting an NFT certificate
    const newCertificate: Certificate = {
      id: Math.random().toString(36).substring(7),
      courseId,
      courseTitle,
      tokenId: `0x${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      issueDate: Date.now(),
      blockchain: "Polygon",
      imageUrl: "/placeholder.svg?height=250&width=400",
    }

    mockCertificates.push(newCertificate)
    return newCertificate
  },

  verifyCertificate: async (tokenId: string): Promise<Certificate | null> => {
    // Mock implementation of verifying a certificate on the blockchain
    const certificate = mockCertificates.find((cert) => cert.tokenId === tokenId)
    return certificate || null
  },
}
