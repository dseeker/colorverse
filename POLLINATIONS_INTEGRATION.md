# Pollinations.ai API Integration Guide

## API Key Setup

### Environment Configuration

1. Create a `.env` file in the project root (if not already exists)
2. Add the following line to the `.env` file:
   ```
   POLLINATIONS_API_TOKEN=Ak59D5TL82X6feti
   ```

### Security Recommendations
- Never commit the `.env` file to version control
- Add `.env` to your `.gitignore`
- Use environment variable management for different deployment environments

## Implementation Example

### Backend Service (Node.js/Express)

```typescript
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

class PollinationsService {
  private apiToken: string;
  private baseImageUrl = 'https://image.pollinations.ai/';
  private baseTextUrl = 'https://text.pollinations.ai/openai';

  constructor() {
    this.apiToken = process.env.POLLINATIONS_API_TOKEN || '';
    if (!this.apiToken) {
      throw new Error('Pollinations API Token is not configured');
    }
  }

  async generateImage(prompt: string, options: {
    model?: string;
    inputImages?: string[];
    transparent?: boolean;
  } = {}) {
    try {
      const response = await axios.get(this.baseImageUrl + prompt, {
        params: {
          token: this.apiToken,
          model: options.model || 'gptimage',
          image: options.inputImages?.join(','),
          transparent: options.transparent || false
        },
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Pollinations Image Generation Error:', error);
      throw error;
    }
  }

  async generateText(prompt: string) {
    try {
      const response = await axios.get(this.baseTextUrl, {
        params: { prompt },
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Pollinations Text Generation Error:', error);
      throw error;
    }
  }
}

export default new PollinationsService();
```

### Frontend Usage Example

```typescript
import PollinationsService from './PollinationsService';

async function generateAIImage() {
  try {
    const imageResult = await PollinationsService.generateImage('A futuristic cityscape', {
      model: 'gptimage',
      transparent: false
    });
    
    // Handle image result
    console.log(imageResult);
  } catch (error) {
    // Handle error
    console.error('Image generation failed', error);
  }
}
```

## Token Management Best Practices

1. Rotate tokens periodically
2. Implement token validation
3. Use least privilege principle
4. Monitor and log API usage

## Troubleshooting

- Ensure `.env` file is correctly configured
- Check network connectivity
- Verify API token permissions
- Review error logs for specific issues

## Support

For issues with Pollinations.ai integration, contact support@yourcompany.com