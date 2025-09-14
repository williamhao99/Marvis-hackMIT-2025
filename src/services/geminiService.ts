import { GoogleGenAI } from '@google/genai'
import mime from 'mime'

export interface GeminiProcessingResult {
  success: boolean
  processedFiles: Array<{
    fileName: string
    content: Buffer
    mimeType: string
  }>
  textOutput?: string
  error?: string
}

export class GeminiService {
  private ai: GoogleGenAI
  private model: string = 'gemini-2.5-flash-image-preview'

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    this.ai = new GoogleGenAI({ apiKey })
  }

  async processDocumentWithPrompt(
    inputText: string,
    fileName: string = 'generated_output'
  ): Promise<GeminiProcessingResult> {
    try {
      const config = {
        responseModalities: ['IMAGE', 'TEXT']
      }

      const contents = [
        {
          role: 'user' as const,
          parts: [
            {
              text: inputText
            }
          ]
        }
      ]

      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config,
        contents
      })

      const processedFiles: Array<{
        fileName: string
        content: Buffer
        mimeType: string
      }> = []

      let textOutput = ''
      let fileIndex = 0

      for await (const chunk of response) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue
        }

        // Handle inline data (images/files)
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData
          const mimeType = inlineData.mimeType || 'application/octet-stream'
          const fileExtension = mime.getExtension(mimeType) || 'bin'
          const buffer = Buffer.from(inlineData.data || '', 'base64')

          processedFiles.push({
            fileName: `${fileName}_${fileIndex++}.${fileExtension}`,
            content: buffer,
            mimeType
          })
        } else {
          // Handle text content
          if (chunk.text) {
            textOutput += chunk.text
          }
        }
      }

      return {
        success: true,
        processedFiles,
        textOutput: textOutput || undefined
      }
    } catch (error: any) {
      console.error('Gemini processing error:', error)
      return {
        success: false,
        processedFiles: [],
        error: error.message || 'Unknown error occurred'
      }
    }
  }

  async processPDF(pdfData: Buffer, customPrompt?: string): Promise<GeminiProcessingResult> {
    const defaultPrompt = `Analyze this PDF document and extract key assembly or instruction information.
    If this contains assembly instructions, create a simplified visual guide or diagram showing the key steps.
    Focus on the most important assembly steps and safety considerations.`

    const prompt = customPrompt || defaultPrompt

    // Convert PDF to base64 for Gemini
    const base64Data = pdfData.toString('base64')

    try {
      const config = {
        responseModalities: ['IMAGE', 'TEXT']
      }

      const contents = [
        {
          role: 'user' as const,
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data
              }
            }
          ]
        }
      ]

      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config,
        contents
      })

      const processedFiles: Array<{
        fileName: string
        content: Buffer
        mimeType: string
      }> = []

      let textOutput = ''
      let fileIndex = 0

      for await (const chunk of response) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue
        }

        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData
          const mimeType = inlineData.mimeType || 'application/octet-stream'
          const fileExtension = mime.getExtension(mimeType) || 'bin'
          const buffer = Buffer.from(inlineData.data || '', 'base64')

          processedFiles.push({
            fileName: `pdf_processed_${fileIndex++}.${fileExtension}`,
            content: buffer,
            mimeType
          })
        } else {
          if (chunk.text) {
            textOutput += chunk.text
          }
        }
      }

      return {
        success: true,
        processedFiles,
        textOutput: textOutput || undefined
      }
    } catch (error: any) {
      console.error('PDF processing error:', error)
      return {
        success: false,
        processedFiles: [],
        error: error.message || 'Unknown error occurred'
      }
    }
  }
}