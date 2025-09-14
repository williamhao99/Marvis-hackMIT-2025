import axios from 'axios'
import { NanobananaService, NanobananaResponse } from './nanobananaService'

export interface PDFProcessingResult {
  success: boolean
  originalPdfUrl?: string
  nanobananaResult?: NanobananaResponse
  processedFiles: Array<{
    fileName: string
    content: Buffer
    mimeType: string
    source: 'nanobanana'
  }>
  s3Urls?: string[]
  textOutput?: string
  error?: string
}

export class PDFProcessingService {
  private nanobananaService: NanobananaService
  private s3BucketUrl: string

  constructor(s3BucketUrl: string = 'https://hackmit25.s3.amazonaws.com') {
    this.nanobananaService = new NanobananaService()
    this.s3BucketUrl = s3BucketUrl
  }

  async processManualFromURL(
    pdfUrl: string,
    productTitle: string
  ): Promise<PDFProcessingResult> {
    try {
      console.log(`📄 Starting enhanced PDF processing for: ${productTitle}`)
      console.log(`🔗 PDF URL: ${pdfUrl}`)

      // Step 1: Download the PDF
      const pdfBuffer = await this.downloadPDF(pdfUrl)
      if (!pdfBuffer) {
        return {
          success: false,
          error: 'Failed to download PDF from URL',
          processedFiles: []
        }
      }

      // Step 2: Process with nanobanana (if available)
      let nanobananaResult: NanobananaResponse | undefined
      if (this.nanobananaService.isConfigured()) {
        console.log('🍌 Processing with nanobanana...')
        const nanobananaPrompt = `Enhance this assembly manual for "${productTitle}" by creating optimized instruction content for AR glasses display. Focus on concise, actionable steps.`
        nanobananaResult = await this.nanobananaService.processPDFWithNanobanana(pdfBuffer, nanobananaPrompt)
      } else {
        console.log('⏭️ Skipping nanobanana (not configured)')
      }

      // Step 3: Process results
      const processedFiles: Array<{
        fileName: string
        content: Buffer
        mimeType: string
        source: 'nanobanana'
      }> = []

      // Add nanobanana results (if they contain files)
      if (nanobananaResult?.success && nanobananaResult.result?.files) {
        nanobananaResult.result.files.forEach((file: any, index: number) => {
          processedFiles.push({
            fileName: `nanobanana_${index}.${file.extension || 'bin'}`,
            content: Buffer.from(file.data, 'base64'),
            mimeType: file.mimeType || 'application/octet-stream',
            source: 'nanobanana'
          })
        })
      }

      // Step 4: Upload to S3
      const s3Urls = await this.uploadFilesToS3(processedFiles, productTitle)

      // Get text output from nanobanana
      let textOutput = ''
      if (nanobananaResult?.success && nanobananaResult.result?.text) {
        textOutput = nanobananaResult.result.text
      }

      console.log(`✅ PDF processing complete. Generated ${processedFiles.length} files.`)

      return {
        success: true,
        originalPdfUrl: pdfUrl,
        nanobananaResult,
        processedFiles,
        s3Urls,
        textOutput: textOutput || undefined
      }
    } catch (error: any) {
      console.error('❌ PDF processing failed:', error)
      return {
        success: false,
        error: error.message || 'Unknown PDF processing error',
        processedFiles: []
      }
    }
  }

  private async downloadPDF(url: string): Promise<Buffer | null> {
    try {
      console.log(`⬇️ Downloading PDF from: ${url}`)
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AssemblyBot/1.0)'
        }
      })

      const buffer = Buffer.from(response.data)
      console.log(`✅ Downloaded PDF (${buffer.length} bytes)`)
      return buffer
    } catch (error: any) {
      console.error('❌ Failed to download PDF:', error.message)
      return null
    }
  }

  private async uploadFilesToS3(
    files: Array<{fileName: string, content: Buffer, mimeType: string, source: string}>,
    productTitle: string
  ): Promise<string[]> {
    const s3Urls: string[] = []

    try {
      for (const file of files) {
        const sanitizedProductName = productTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `processed/${sanitizedProductName}/${timestamp}_${file.source}_${file.fileName}`
        const s3Url = `${this.s3BucketUrl}/${fileName}`

        console.log(`📤 Uploading to S3: ${fileName}`)

        try {
          const response = await axios.put(s3Url, file.content, {
            headers: {
              'Content-Type': file.mimeType
            },
            timeout: 30000
          })

          if (response.status === 200) {
            s3Urls.push(s3Url)
            console.log(`✅ Uploaded: ${s3Url}`)
          }
        } catch (uploadError: any) {
          console.error(`❌ Failed to upload ${fileName}:`, uploadError.message)
        }
      }
    } catch (error: any) {
      console.error('❌ S3 upload process failed:', error)
    }

    return s3Urls
  }
}