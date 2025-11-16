"use client";
import config from "@/lib/config";
import { Image as IKImage, upload, ImageKitProvider } from "@imagekit/next";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface UploadResponse {
  filePath: string;
  name: string;
  fileId: string;
  url: string;
}

const authenticator = async () => {
  try {
    const response = await fetch(`${config.env.apiEndpoint}/api/auth/imagekit`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    const { token, expire, signature } = data;
    return { token, expire, signature };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Authentication request failed:${message}`);
  }
};

const ImageUpload = ({
  onFileChange,
}: {
  onFileChange: (filePath: string) => void;
}) => {
  const ikUploadRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ filePath: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onError = (err: Error) => {
    console.error("Upload Error:", err);
    toast.error("Error uploading image", {
      description:
        err.message || "Your image was not uploaded. Please try again.",
    });
    setIsUploading(false);
    setUploadProgress(0);
  };

  const onSuccess = (res: UploadResponse) => {
    console.log("Upload Success:", res);
    setFile({ filePath: res.filePath });
    onFileChange(res.filePath);
    toast.success("Image uploaded successfully!", {
      description: `${res.name} uploaded`,
    });
    setIsUploading(false);
    setUploadProgress(100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type", {
        description:
          "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
      });
      return;
    }

    // Validate file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      toast.error("File too large", {
        description: "Please upload an image smaller than 5MB",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get authentication parameters
      const authParams = await authenticator();

      // Upload the file
      const uploadResponse = await upload({
        file: selectedFile,
        fileName: selectedFile.name,
        signature: authParams.signature,
        token: authParams.token,
        expire: authParams.expire,
        publicKey: config.env.imagekit.publicKey,
        // Track upload progress
        onProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      // Call success handler
      onSuccess(uploadResponse as UploadResponse);
    } catch (error) {
      // Call error handler
      onError(error instanceof Error ? error : new Error("Upload failed"));
    } finally {
      // Reset file input
      if (ikUploadRef.current) {
        ikUploadRef.current.value = "";
      }
    }
  };
  return (
    <ImageKitProvider urlEndpoint={config.env.imagekit.urlEndpoint}>
      <div className="space-y-4">
        <input
          type="file"
          ref={ikUploadRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <button
          className="upload-btn"
          onClick={(e) => {
            e.preventDefault();
            ikUploadRef.current?.click();
          }}
          disabled={isUploading}
        >
          <Image
            src="/icons/upload.svg"
            width={20}
            height={20}
            alt="upload"
            className="object-contain"
          />
          <p className="text-base text-light-100">
            {isUploading ? "Uploading..." : "Upload Your ID"}
          </p>
          {file && !isUploading && (
            <p className="upload-filename">{file.filePath}</p>
          )}
        </button>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Preview uploaded image */}
        {file && !isUploading && (
          <div className="mt-4">
            <IKImage
              src={file.filePath}
              width={500}
              height={500}
              alt="Uploaded image"
              className="rounded-lg shadow-lg"
              transformation={[{ width: 500, height: 500 }]}
            />
          </div>
        )}
      </div>
    </ImageKitProvider>
  );
};

export default ImageUpload;
