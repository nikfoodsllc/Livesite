export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  street: string;
  town: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  lat: number;
  lng: number;
  full_address: string;
}

export interface PlacesAutocompleteResponse {
  data: {
    data: {
      predictions: PlacePrediction[];
    };
  };
}

export interface PlaceDetailsResponse {
  data: PlaceDetails;
  message: string;
}
