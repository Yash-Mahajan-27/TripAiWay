import React, { useEffect, useState } from "react"
import GooglePlacesAutocomplete from "react-google-places-autocomplete"
import { Input } from "@/components/ui/input"
import { AI_PROMPT, SelectBudgetOptions, SelectTravelList } from "@/constants/options"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { chatSession } from "@/service/AIModal"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/service/firebaseConfig"
import { AiOutlineLoading3Quarters } from "react-icons/ai"
import { useNavigate } from "react-router-dom"
import { FaMapMarkerAlt, FaCalendarAlt, FaWallet, FaUsers } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import { useGoogleLogin } from "@react-oauth/google"
import axios from "axios"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog"

function CreateTrip() {
  const defaultLocation = {
    label: "Nashik, Maharashtra, India",
    value: { description: "Nashik, Maharashtra, India" }
  }
  const [place, setPlace] = useState(defaultLocation)
  const [formData, setFromData] = useState({
    location: defaultLocation.label
  })
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [openDialog, setOpenDialog] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (name, value) => {
    setFromData({
      ...formData,
      [name]: value
    })
  }

  useEffect(() => {
    console.log(formData)
  }, [formData])

  const login = useGoogleLogin({
    onSuccess: (codeResp) => GetUserProfile(codeResp),
    onError: (error) => console.log(error)
  })

  const GetUserProfile = (tokenInfo) => {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?acess_token=${tokenInfo?.access_token}`, {
      headers: {
        Authorization: `Bearer ${tokenInfo?.access_token}`,
        Accept: 'Application/json'
      }
    }).then((resp) => {
      localStorage.setItem('user', JSON.stringify(resp.data))
      setOpenDialog(false)
      OnGenerateTrip()
    })
  }

  const OnGenerateTrip = async() => {
    const user = localStorage.getItem('user')
    if(!user) {
      setOpenDialog(true)
      return
    }
    if(!formData?.totalDays || !formData?.location || !formData?.budget || !formData?.traveler){
      toast("Please fill all details!")
      return
    }
    toast("Form generated.")
    setLoading(true)
    const FINAL_PROMPT = AI_PROMPT
      .replace('{location}', formData?.location)
      .replace('{totalDays}', formData?.totalDays)
      .replace('{traveler}', formData?.traveler)
      .replace('{budget}', formData?.budget)

    const result = await chatSession.sendMessage(FINAL_PROMPT)
    setLoading(false)
    SaveAiTrip(result?.response?.text())
  }

  const SaveAiTrip = async(TripData) => {
    setLoading(true)
    const user = JSON.parse(localStorage.getItem('user'))
    const docId = Date.now().toString()
    await setDoc(doc(db, "AiTrips", docId), {
      userSelection: formData,
      tripData: JSON.parse(TripData),
      userEmail: user?.email,
      id: docId
    })
    setLoading(false)
    navigate('/view-trip/'+docId)
  }

  const isValidDays = () => {
    const days = parseInt(formData.totalDays);
    return days > 0;
  }

  const nextStep = () => {
    if (currentStep === 1 && !formData.location) {
      toast("Please select a destination")
      return
    }
    if (currentStep === 2 && !formData.totalDays) {
      toast("Please enter duration")
      return
    }
    if (currentStep === 2 && !isValidDays()) {
      toast("Please enter a valid number of days (greater than 0)")
      return
    }
    if (currentStep === 3 && !formData.budget) {
      toast("Please select budget")
      return
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-6 sm:mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
            step === currentStep 
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white' 
              : step < currentStep 
                ? 'bg-green-500 dark:bg-green-400 text-white'
                : 'bg-muted text-muted-foreground'
          }`}>
            <span className="text-xs sm:text-base">
              {step === 1 && <FaMapMarkerAlt />}
              {step === 2 && <FaCalendarAlt />}
              {step === 3 && <FaWallet />}
              {step === 4 && <FaUsers />}
            </span>
          </div>
          {step < 4 && (
            <div className={`w-10 sm:w-20 h-1 ${
              step < currentStep ? 'bg-green-500 dark:bg-green-400' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6 transform transition-all duration-500">
            <div className="text-center mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text mb-2">Choose Your Destination</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Where would you like your adventure to begin?</p>
            </div>
            <div className="bg-card p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border-2 border-indigo-100 dark:border-indigo-900">
              <GooglePlacesAutocomplete
                apiKey={import.meta.env.VITE_GOOGLE_PLACES_API_KEY}
                selectProps={{
                  place,
                  defaultValue: defaultLocation,
                  onChange: (v) => {setPlace(v); handleInputChange('location', v.label)},
                  placeholder: "Search for a destination...",
                  styles: {
                    control: (provided) => ({
                      ...provided,
                      padding: '8px',
                      borderRadius: '1rem',
                      border: '2px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)'
                    }),
                    menu: (provided) => ({
                      ...provided,
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)'
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isFocused ? 'var(--accent)' : 'var(--background)',
                      color: 'var(--foreground)'
                    }),
                    input: (provided) => ({
                      ...provided,
                      color: 'var(--foreground)'
                    }),
                    singleValue: (provided) => ({
                      ...provided,
                      color: 'var(--foreground)'
                    })
                  }
                }}
                autocompletionRequest={{
                  componentRestrictions: { country: 'in' }
                }}
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4 sm:space-y-6 transform transition-all duration-500">
            <div className="text-center mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text mb-2">Plan Your Duration</h2>
              <p className="text-sm sm:text-base text-muted-foreground">How many days would you like to explore?</p>
            </div>
            <div className="bg-card p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border-2 border-indigo-100 dark:border-indigo-900">
              <Input
                placeholder="Number of days"
                type="number"
                min="1"
                className="text-base sm:text-lg py-4 sm:py-8 text-center sm:text-2xl"
                onChange={(v) => handleInputChange('totalDays', v.target.value)}
              />
              {formData.totalDays && !isValidDays() && (
                <p className="text-red-500 mt-2 text-center text-sm sm:text-base">Please enter a number greater than 0</p>
              )}
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-4 sm:space-y-6 transform transition-all duration-500">
            <div className="text-center mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text mb-2">Set Your Budget</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Choose your preferred spending level</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {SelectBudgetOptions.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleInputChange('budget', item.title)}
                  className={`cursor-pointer p-4 sm:p-8 rounded-xl sm:rounded-2xl transition-all duration-300 hover:transform hover:scale-105 flex justify-between items-center
                    ${formData?.budget === item.title
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-white shadow-xl'
                      : 'bg-card border-2 border-indigo-100 dark:border-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                >
                  <div className="flex-grow">
                    <h3 className={`text-base sm:text-xl font-bold mb-1 sm:mb-2 ${formData?.budget === item.title ? 'text-white' : 'text-foreground'}`}>
                      {item.title}
                    </h3>
                    <p className={`text-xs sm:text-sm ${formData?.budget === item.title ? 'text-indigo-100' : 'text-muted-foreground'}`}>
                      {item.desc}
                    </p>
                  </div>
                  <div className="text-3xl sm:text-5xl mb-0 sm:mb-4">{item.icon}</div>
                </div>
              ))}
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-4 sm:space-y-6 transform transition-all duration-500">
            <div className="text-center mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text mb-2">Choose Your Travel Group</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Who will be joining you on this adventure?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {SelectTravelList.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleInputChange('traveler', item.people)}
                  className={`cursor-pointer p-4 sm:p-8 rounded-xl sm:rounded-2xl transition-all duration-300 hover:transform hover:scale-105 flex
                    ${formData?.traveler === item.people 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 text-white shadow-xl' 
                      : 'bg-card border-2 border-indigo-100 dark:border-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                >
                  <div className="flex-grow">
                    <h3 className={`text-base sm:text-xl font-bold mb-1 sm:mb-2 ${formData?.traveler === item.people ? 'text-white' : 'text-foreground'}`}>
                      {item.title}
                    </h3>
                    <p className={`text-xs sm:text-sm ${formData?.traveler === item.people ? 'text-indigo-100' : 'text-muted-foreground'}`}>
                      {item.desc}
                    </p>
                    <p className={`mt-1 sm:mt-2 text-xs sm:text-sm font-medium ${formData?.traveler === item.people ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {item.people}
                    </p>
                  </div>
                  <div className="text-3xl sm:text-5xl">{item.icon}</div>
                </div>
              ))}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-background dark:to-background">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-12">
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-blue-400 dark:to-indigo-400 text-transparent bg-clip-text mb-2 sm:mb-4">
            Design Your Perfect Journey
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Let our AI craft your dream itinerary in four simple steps
          </p>
        </div>

        <div className="bg-background/80 backdrop-blur-lg rounded-xl sm:rounded-3xl shadow-xl p-4 sm:p-8 mb-6 sm:mb-8 border border-border">
          {renderStepIndicator()}
          {renderStep()}
        </div>

        <div className="flex justify-between mt-4 sm:mt-8">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-4 sm:px-8 py-2 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base ${
              currentStep === 1
                ? 'bg-muted text-muted-foreground'
                : 'bg-background text-foreground hover:bg-accent'
            }`}
          >
            Previous
          </Button>
          
          {currentStep === 4 ? (
            <Button
              onClick={OnGenerateTrip}
              disabled={loading}
              className="px-4 sm:px-8 py-2 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-lg sm:rounded-xl hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 transition-all duration-300 text-sm sm:text-base"
            >
              {loading ? (
                <div className="flex items-center">
                  <AiOutlineLoading3Quarters className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                  <span>Creating Magic...</span>
                </div>
              ) : (
                <span>Generate Trip ✨</span>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={currentStep === 2 && (!formData.totalDays || !isValidDays())}
              className="px-4 sm:px-8 py-2 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-lg sm:rounded-xl hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 transition-all duration-300 text-sm sm:text-base"
            >
              Next
            </Button>
          )}
        </div>
      </div>

      <Dialog open={openDialog}>
        <DialogContent className="max-w-[90%] sm:max-w-md mx-auto rounded-lg">
          <DialogHeader>
            <DialogDescription>
              <div className="flex flex-col items-center space-y-4 sm:space-y-6 py-4 sm:py-6">
                <img src="/logo.png" className="h-24 sm:h-32 w-auto"/>
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Welcome Back</h2>
                  <p className="mt-2 text-sm sm:text-base text-muted-foreground">Sign in securely with Google to continue your journey</p>
                </div>
                <Button 
                  onClick={login} 
                  className="w-full flex items-center justify-center gap-3 bg-background border-2 border-input text-foreground hover:bg-accent transition-colors py-4 sm:py-6 text-sm sm:text-base"
                >
                  <FcGoogle className="h-5 w-5 sm:h-6 sm:w-6"/>
                  <span className="font-medium">Continue with Google</span>
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CreateTrip
