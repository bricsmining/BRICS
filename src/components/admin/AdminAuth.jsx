import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Chrome, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AdminAuth = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState('google'); // 'google' or 'email'
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const { toast } = useToast();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        const adminData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          authMethod: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
          loginTime: new Date().toISOString()
        };
        
        // Store admin session
        localStorage.setItem('adminAuth', JSON.stringify(adminData));
        sessionStorage.setItem('adminSession', 'active');
        
        onAuthSuccess(adminData);
      }
    });

    return () => unsubscribe();
  }, [onAuthSuccess]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      
      toast({
        title: '✅ Authentication Successful',
        description: `Welcome back, ${result.user.displayName || result.user.email}!`,
        className: 'bg-[#1a1a1a] text-white'
      });
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      let errorMessage = 'Failed to authenticate with Google.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please contact admin.';
      }
      
      toast({
        title: '❌ Authentication Failed',
        description: errorMessage,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { email, password } = credentials;
      
      if (!email || !password) {
        toast({
          title: '❌ Missing Information',
          description: 'Please enter both email and password.',
          variant: 'destructive',
          className: 'bg-[#1a1a1a] text-white'
        });
        return;
      }
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: '✅ Authentication Successful',
        description: `Welcome back, ${result.user.email}!`,
        className: 'bg-[#1a1a1a] text-white'
      });
      
    } catch (error) {
      console.error('Email sign-in error:', error);
      
      let errorMessage = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please contact admin.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Try password reset if needed.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      toast({
        title: '❌ Authentication Failed',
        description: errorMessage,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!credentials.email) {
      toast({
        title: '❌ Email Required',
        description: 'Please enter your email address first.',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, credentials.email);
      setResetEmailSent(true);
      
      toast({
        title: '✅ Reset Email Sent',
        description: `Password reset email sent to ${credentials.email}`,
        className: 'bg-[#1a1a1a] text-white'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send reset email.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      
      toast({
        title: '❌ Reset Failed',
        description: errorMessage,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Admin Portal
              </CardTitle>
              <p className="text-gray-400 mt-2">
                Secure access to SkyTON administration
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Auth Method Toggle */}
            <div className="flex bg-gray-700/30 rounded-lg p-1">
              <button
                onClick={() => setAuthMethod('google')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  authMethod === 'google'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Chrome className="w-4 h-4 inline mr-2" />
                Google
              </button>
              <button
                onClick={() => setAuthMethod('email')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  authMethod === 'email'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </button>
            </div>

            {authMethod === 'google' ? (
              /* Google Authentication */
              <div className="space-y-4">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg border border-gray-300 transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Chrome className="w-5 h-5 mr-2 text-blue-500" />
                  )}
                  Continue with Google
                </Button>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Sign in with your authorized Google account
                  </p>
                </div>
              </div>
            ) : (
              /* Email Authentication */
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="admin@skyton.com"
                      value={credentials.email}
                      onChange={(e) => setCredentials(prev => ({ 
                        ...prev, 
                        email: e.target.value 
                      }))}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ 
                        ...prev, 
                        password: e.target.value 
                      }))}
                      className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  Sign In
                </Button>
                
                {/* Password Reset */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1 mx-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {resetEmailSent ? 'Reset email sent' : 'Forgot password?'}
                  </button>
                </div>
              </form>
            )}

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Admin Access Only</p>
                  <p>This portal is restricted to authorized administrators. All access is logged and monitored.</p>
                </div>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminAuth;