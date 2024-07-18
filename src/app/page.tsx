'use client'

import React, { useState, FormEvent } from 'react'
import { Circles } from 'react-loader-spinner'
import { IoCloudUploadSharp } from 'react-icons/io5'
import { RiDeleteBin6Line } from 'react-icons/ri'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { useDropzone, Accept } from 'react-dropzone'

import Divider from '@/components/Divider'
import ContainerWithLabel from '@/components/ContainerWithLabel'
import Button from '@/components/Button'

const acceptNewFile: Accept = {
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
}

const acceptOldFiles: Accept = {
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
}

export default function Home() {
  const [newFile, setNewFile] = useState<File | null>(null)
  const [oldFiles, setOldFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isSuccessFiles, setIsSuccessFiles] = useState(false)
  const [isFailFiles, setIsFailFiles] = useState(false)
  const [error, setError] = useState<any>({
    newFile: '',
    oldFiles: '',
    apiRes: '',
  })
  const [apiResponse, setApiResponse] = useState<any>(null)

  const handleNewFileDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (
      file &&
      (file.type === 'text/plain' ||
        file.type === 'application/msword' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ) {
      setNewFile(file)
      setError({ ...error, newFile: '' })
    } else {
      setError({
        ...error,
        newFile: "'New file' must be a single file .txt, .doc, or .docx",
      })
    }
  }

  const handleOldFilesDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(
      (file) =>
        file.type === 'text/plain' ||
        file.type === 'application/msword' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

    if (validFiles.length === acceptedFiles.length) {
      setOldFiles(validFiles)
      setError({ ...error, oldFiles: '' })
    } else {
      setError({
        ...error,
        oldFiles: "'Old files' must be .txt, .doc, or .docx",
      })
    }
  }

  const clearForm = () => {
    setNewFile(null)
    setOldFiles([])
    resetValues()
  }

  const resetValues = () => {
    setIsSuccessFiles(false)
    setIsFailFiles(false)
    setError({
      newFile: '',
      oldFiles: '',
      apiRes: '',
    })
    setApiResponse(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    resetValues()

    if (newFile && oldFiles.length > 0) {
      setLoading(true)

      const formData = new FormData()
      formData.append('newFile', newFile)
      oldFiles.forEach((file) => {
        formData.append('oldFiles', file)
      })

      try {
        const response = await fetch('/api/passage', {
          method: 'POST',
          body: formData,
        })
        const data = await response.json()        

        if (response.ok) {
          setApiResponse(data)
          if (data?.data?.matched.length > 0) setIsSuccessFiles(true)
          if (data?.data?.failed.length > 0) setIsFailFiles(true)
        } else {
          setError({
            ...error,
            apiRes: data?.message || 'Something went wrong',
          })
        }
      } catch (err) {
        setError({ ...error, apiRes: 'An error occured, try reducing payload size to 4 mb' })
        console.log("error --> ", err);
      } finally {
        setLoading(false)
      }
    } else {
      const updateError = { ...error }

      if (!newFile)
        updateError.newFile =
          "'New file' must be a single file .txt, .doc, or .docx"

      if (oldFiles.length === 0)
        updateError.oldFiles = "'Old files' must be .txt, .doc, or .docx"

      setError(updateError)
    }
  }

  const downloadJuxtapositionTxtFile = () => {
    if (!apiResponse) return

    const element = document.createElement('a')
    const file = new Blob(
      [JSON.stringify(apiResponse?.data?.matched, null, 2)],
      { type: 'text/plain' }
    )
    element.href = URL.createObjectURL(file)
    element.download = 'matching_commentaries.txt'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const downloadWdiffTxtFile = () => {
    if (!apiResponse) return;
  
    const filteredMatched = apiResponse.data.matched.map((item: any) => {
      let recentContentFromOldFiles = item.oldFilesContent[0]; // Start with the first item
  
      for (let i = 1; i < item.oldFilesContent.length; i++) {
        if (item.oldFilesContent[i].fileName === recentContentFromOldFiles.fileName)
          recentContentFromOldFiles = item.oldFilesContent[i];
        else
          break
      }
  
      return {
        biblicalPassage: item.biblicalPassage,
        recentContentFromOldFiles
      };
    });
  
    const element = document.createElement('a');
    const file = new Blob(
      [JSON.stringify(filteredMatched, null, 2)],
      { type: 'text/plain' }
    );
    element.href = URL.createObjectURL(file);
    element.download = 'recent_matching_commentaries.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element); // Clean up the DOM
  }

  const downloadFailedTxtFile = () => {
    if (!apiResponse) return

    const element = document.createElement('a')
    const file = new Blob(
      [JSON.stringify(apiResponse?.data?.failed, null, 2)],
      { type: 'text/plain' }
    )
    element.href = URL.createObjectURL(file)
    element.download = 'failed_extracted_text.txt'
    document.body.appendChild(element)
    element.click()
  }

  const downloadXlsxFile = () => {
    if (!apiResponse) return

    let maxOldDatesCount = 0

    // Determine the maximum number of old dates
    apiResponse?.data?.matched.forEach((item: any) => {
      const oldDatesCount = item.oldFilesContent.length
      maxOldDatesCount = Math.max(maxOldDatesCount, oldDatesCount)
    })

    // Create header
    const header = ['Date', 'Passage']
    for (let i = 1; i <= maxOldDatesCount; i++) {
      header.push(`Old_Date_${i}`, `Old_File_${i}`)
      // header.push(`Old_File_${i}`)
    }

    // Create rows
    const rows = apiResponse?.data?.matched.map((item: any) => {
      const row = [item.newFileContent[0].date, item.biblicalPassage]
      const oldDatesCount = item.oldFilesContent.length
      for (let i = 0; i < maxOldDatesCount; i++) {
        if (i < oldDatesCount) {
          row.push(item.oldFilesContent[i].date, item.oldFilesContent[i].fileName)
          // console.log("item --> ", item.oldFilesContent[i]);
          
        } else {
          row.push('')
        }
      }
      return row
    })

    // Combine header and rows
    const data = [header, ...rows]    

    // Create a worksheet
    const ws = XLSX.utils.aoa_to_sheet(data)

    // Create a workbook and add the worksheet
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    // Generate a binary string representation of the workbook
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    // Create a Blob from the binary string
    const blob = new Blob([wbout], { type: 'application/octet-stream' })

    // Create a link element and trigger a download
    const element = document.createElement('a')
    element.href = URL.createObjectURL(blob)
    element.download = 'matching_commentaries.xlsx'
    document.body.appendChild(element)
    element.click()

    // Clean up
    document.body.removeChild(element)
  }

  const {
    getRootProps: getNewFileRootProps,
    getInputProps: getNewFileInputProps,
  } = useDropzone({
    onDrop: handleNewFileDrop,
    accept: acceptNewFile,
    maxFiles: 1,
  })

  const {
    getRootProps: getOldFilesRootProps,
    getInputProps: getOldFilesInputProps,
  } = useDropzone({
    onDrop: handleOldFilesDrop,
    accept: acceptOldFiles,
    multiple: true,
  })

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-blue-200">
      <main className="flex-grow flex items-center justify-center py-14 px-4 md:px-12">
        {loading ? (
          <div className="w-full flex items-center justify-center">
            <Circles
              height="80"
              width="80"
              color="#3b82f6"
              ariaLabel="circles-loading"
              visible={true}
            />
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg p-6 md:p-12 max-w-3xl w-full">
            <h1 className="text-xl text-center text-blue-400 font-semibold">
              Get Matching Commentaries for Biblical Passages
            </h1>

            <Divider label="Upload files" />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="flex flex-col">
                  <p className="font-semibold">New File</p>
                  <p className="text-gray-500 text-sm">
                    Select a single file (.txt, .doc, .docx)
                  </p>
                </label>
                <div
                  {...getNewFileRootProps({
                    className:
                      'border p-4 rounded-md flex justify-center items-center cursor-pointer',
                  })}
                >
                  <input {...getNewFileInputProps()} />
                  <div className="flex flex-col justify-center items-center">
                    <IoCloudUploadSharp className="text-gray-500" size={30} />
                    <p className="text-gray-500 font-semibold">Upload a file</p>
                    <p className="text-gray-500 text-xs">
                      Choose file or drop here
                    </p>
                  </div>
                </div>
                {newFile && (
                  <span className="text-blue-500 text-sm">{newFile.name}</span>
                )}
                {error.newFile && (
                  <p className="text-red-500 text-xs italic">{error.newFile}</p>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                <label className="flex flex-col">
                  <p className="font-semibold">Old Files</p>
                  <p className="text-gray-500 text-sm">
                    Select multiple files (.txt, .doc, .docx)
                  </p>
                </label>
                <div
                  {...getOldFilesRootProps({
                    className:
                      'border p-4 rounded-md flex justify-center items-center cursor-pointer',
                  })}
                >
                  <input {...getOldFilesInputProps()} />
                  <div className="flex flex-col justify-center items-center">
                    <IoCloudUploadSharp className="text-gray-500" size={30} />
                    <p className="text-gray-500 font-semibold">Upload a file</p>
                    <p className="text-gray-500 text-xs">
                      Choose files or drop here
                    </p>
                  </div>
                </div>
                {oldFiles.length > 0 && (
                  <ul className="text-blue-500 text-sm">
                    {oldFiles.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                )}
                {error.oldFiles && (
                  <p className="text-red-500 text-xs italic">
                    {error.oldFiles}
                  </p>
                )}
              </div>

              {error?.apiRes && (
                <p className="text-red-500 text-xs italic">{error.apiRes}</p>
              )}

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="w-1/2 md:w-1/3 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 mt-6"
                >
                  Submit
                </button>
              </div>
            </form>

            <Divider label="Download files" />

            {apiResponse?.success && (
              <div className="mt-4 p-3 pl-6 bg-green-100 text-green-700 rounded-lg mb-6">
                Files are ready to download
              </div>
            )}

            {apiResponse?.success && !isSuccessFiles && (
              <p className="text-sm italic mb-4">No matching passages found</p>
            )}

            <ContainerWithLabel
              label="Success"
              labelColor="text-blue-500"
              borderColor="border-blue-300"
            >
              <div className="flex flex-wrap justify-center items-center md:space-x-4">
                <Button
                  onClick={downloadXlsxFile}
                  disabled={!isSuccessFiles}
                >
                  Matching XLSX
                </Button>
                <Button
                  className="py-2 mt-4 md:mt-0"
                  onClick={downloadJuxtapositionTxtFile}
                  disabled={!isSuccessFiles}
                >
                  Matching TXT
                </Button>
                <Button
                  className="py-2 mt-4"
                  onClick={downloadWdiffTxtFile}
                  disabled={!isSuccessFiles}
                >
                  Recent TXT
                </Button>
              </div>
            </ContainerWithLabel>
            <br />

            {apiResponse?.success && !isFailFiles && (
              <p className="text-sm italic mb-4">No failed text found</p>
            )}

            <ContainerWithLabel
              label="Failed"
              labelColor="text-red-500"
              borderColor="border-red-300"
            >
              <div className="flex justify-center">
                <Button
                  onClick={downloadFailedTxtFile}
                  disabled={!isFailFiles}
                >
                  Missed TXT
                </Button>
              </div>
            </ContainerWithLabel>

            <Divider label="Reset" />

            <div className="flex justify-end text-blue-400">
              <button
                className="flex justify-center text-sm"
                onClick={clearForm}
              >
                <RiDeleteBin6Line className="mr-2" size={20} />
                <span>Clear form</span>
              </button>
            </div>
          </div>
        )}
      </main>
      <footer className="bg-white text-center py-4">
        <p className="text-gray-600">
          Copyright © 2024 - Comunità di Sant’Egidio
        </p>
        <p className="text-gray-600">
          Contact developer:{' '}
          <Link
            href="mailto:arslanahmed19@icloud.com"
            className="hover:underline"
          >
            arslanahmed19@icloud.com
          </Link>
        </p>
      </footer>
    </div>
  )
}