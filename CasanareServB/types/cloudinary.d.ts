declare module 'cloudinary' {
  export const v2: {
    config: (config: {
      cloud_name: string;
      api_key: string;
      api_secret: string;
    }) => void;
    uploader: {
      upload: (
        path: string,
        options?: {
          folder?: string;
          [key: string]: any;
        }
      ) => Promise<{
        public_id: string;
        secure_url: string;
        [key: string]: any;
      }>;
      destroy: (public_id: string) => Promise<any>;
    };
  };
}