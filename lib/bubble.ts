import { User } from '@/types/user';

// Bubble API URLs - using the standard format
// Format: https://[app-name].bubbleapps.io/api/1.1/wf/[workflow-name]
const BUBBLE_API_URL = 'https://rm-project-1.bubbleapps.io/api/1.1/wf/create_user';

export async function createBubbleUser(user: User): Promise<boolean> {
  try {
    // Create user data with snake_case field names (Bubble's preferred format)
    const userData = {
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone || ''
    };
    
    console.log('Creating Bubble user with data:', userData);
    console.log('Using Bubble API URL:', BUBBLE_API_URL);
    
    const response = await fetch(BUBBLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    console.log('Bubble API response status:', response.status);
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('Bubble API response data:', responseData);
      return true;
    }
    
    const errorText = await response.text();
    console.error('Failed to create Bubble user. Status:', response.status, 'Response:', errorText);
    
    // If the first attempt fails, try with camelCase field names
    console.log('Trying with camelCase field names...');
    const camelCaseData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || ''
    };
    
    const camelCaseResponse = await fetch(BUBBLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(camelCaseData),
    });
    
    console.log('Bubble API response status (camelCase):', camelCaseResponse.status);
    
    if (!camelCaseResponse.ok) {
      const camelCaseErrorText = await camelCaseResponse.text();
      console.error('Failed to create Bubble user with camelCase. Status:', camelCaseResponse.status, 'Response:', camelCaseErrorText);
      return false;
    }
    
    const camelCaseResponseData = await camelCaseResponse.json();
    console.log('Bubble API response data (camelCase):', camelCaseResponseData);
    return true;
  } catch (error) {
    console.error('Error creating Bubble user:', error);
    return false;
  }
}

// Test function that can be run from the browser console
export function testBubbleAPI() {
  // Make the function available in the browser console
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.testBubbleAPI = async () => {
      const testUser = {
        id: 'test-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user' as const,
        companyId: 'test-company',
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: '1234567890',
        completedIntake: false
      };
      
      console.log('Testing Bubble API with user:', testUser);
      const result = await createBubbleUser(testUser);
      console.log('Test result:', result);
    };
  }
} 