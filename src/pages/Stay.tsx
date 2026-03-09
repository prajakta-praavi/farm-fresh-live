import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Users, Bed, Star, Wifi, Coffee, Trees, Sun, Utensils, Gamepad2, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Layout from "@/components/Layout";
import farmStayImage from "@/assets/farm-stay.jpg";
import farmStaySlide1 from "@/assets/farm stay-1.png";
import farmStaySlide2 from "@/assets/farm stay-2.png";
import farmStaySlide3 from "@/assets/farm stay-3.png";
import { differenceInCalendarDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const amenities = [
  { icon: Wifi, label: "Free Wi-Fi" },
  { icon: Coffee, label: "Farm Meals" },
  { icon: Trees, label: "Nature Walks" },
  { icon: Sun, label: "Sunrise Yoga" },
  { icon: Star, label: "Stargazing" },
  { icon: Users, label: "Farm Activities" },
  { icon: Utensils, label: "Shared Dining Area" },
  { icon: Gamepad2, label: "Kids Play Zone" },
  { icon: Building2, label: "Rooftop Scenic Views" },
  { icon: Briefcase, label: "Meeting-Friendly Spaces" },
];

const stayGallerySlides = [farmStaySlide1, farmStaySlide2, farmStaySlide3];
const TOTAL_ROOMS = 2;
const ROOM_BASE_CAPACITY = 2;
const ROOM_MAX_CAPACITY = 3;
const ROOM_BASE_RATE = 3000;
const EXTRA_BED_CHARGE = 1000;
const MAX_PROPERTY_GUESTS = 15;
const TENT_RATE_PER_GUEST = 1000;

const getFarmStayGstRate = (nightlyTariff: number) => {
  if (nightlyTariff < 1000) return 0;
  if (nightlyTariff <= 7500) return 5;
  return 18;
};

const getStayPricing = (guestCount: number) => {
  const normalizedGuests = Math.max(1, Math.min(MAX_PROPERTY_GUESTS, Number(guestCount || 1)));
  const roomCapacity = TOTAL_ROOMS * ROOM_MAX_CAPACITY;
  const roomGuests = Math.min(normalizedGuests, roomCapacity);
  const tentGuests = Math.max(0, normalizedGuests - roomCapacity);

  const roomsAllocated =
    roomGuests <= 0 ? 0 : roomGuests <= ROOM_MAX_CAPACITY ? 1 : TOTAL_ROOMS;
  const extraBeds =
    roomGuests <= ROOM_BASE_CAPACITY
      ? 0
      : roomGuests <= ROOM_MAX_CAPACITY
        ? 1
        : roomGuests - TOTAL_ROOMS * ROOM_BASE_CAPACITY;

  const roomPrice = roomsAllocated * ROOM_BASE_RATE + extraBeds * EXTRA_BED_CHARGE;
  const tentPrice = tentGuests * TENT_RATE_PER_GUEST;
  const subtotalPerNight = roomPrice + tentPrice;
  const gstRate = getFarmStayGstRate(subtotalPerNight);
  const gstAmountPerNight = Math.round((subtotalPerNight * gstRate) / 100);
  const totalPerNight = subtotalPerNight + gstAmountPerNight;
  const accommodationType =
    tentGuests > 0 ? "ROOM + TENT" : roomsAllocated > 0 ? "ROOM" : "TENT";

  const availabilityMessage =
    tentGuests > 0
      ? "Rooms not available for selected guest count. Tent accommodation is available."
      : "";

  return {
    guests: normalizedGuests,
    roomsAllocated,
    extraBeds,
    roomGuests,
    tentGuests,
    roomPrice,
    tentPrice,
    subtotalPerNight,
    gstRate,
    gstAmountPerNight,
    totalPerNight,
    accommodationType,
    availabilityMessage,
  };
};

const Stay = () => {
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [activeStaySlide, setActiveStaySlide] = useState(0);
  const navigate = useNavigate();

  const maxGuests = MAX_PROPERTY_GUESTS;
  const pricing = getStayPricing(guests);
  const numberOfDays =
    checkIn && checkOut ? Math.max(0, differenceInCalendarDays(checkOut, checkIn)) : 0;
  const subtotalForStay = pricing.subtotalPerNight * numberOfDays;
  const gstForStay = pricing.gstAmountPerNight * numberOfDays;
  const totalForStay = pricing.totalPerNight * numberOfDays;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStaySlide((prev) => (prev + 1) % stayGallerySlides.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (guests > maxGuests) {
      setGuests(maxGuests);
    }
  }, [guests, maxGuests]);

  return (
    <Layout>
      <div className="pt-24 pb-16">
        <div className="relative h-[40vh] min-h-[220px] overflow-hidden sm:h-[50vh]">
          <img src={farmStayImage} alt="Farm Stay" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-foreground/40" />
        </div>

        <div className="container py-12">
          <div className="grid items-stretch gap-8 lg:grid-cols-3">
            <div className="space-y-10 lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl lg:min-h-[430px]"
              >
                <div className="relative h-[280px] w-full sm:h-[360px] lg:h-[430px]">
                  {stayGallerySlides.map((slide, index) => (
                    <img
                      key={`${slide}-${index}`}
                      src={slide}
                      alt={`Farm stay gallery ${index + 1}`}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                        activeStaySlide === index ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                  {stayGallerySlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveStaySlide(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        activeStaySlide === index ? "w-7 bg-white" : "w-2.5 bg-white/60"
                      }`}
                      aria-label={`Go to farm stay image ${index + 1}`}
                    />
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="mb-4 text-2xl font-display font-bold">About Our Farm Stay</h2>
                <p className="mb-4 leading-relaxed text-muted-foreground">
                  Nestled in the heart of Mahabaleshwar lush farmlands, Rushivan Aagro Farm Stay offers a unique
                  escape from urban life. Wake up to the sounds of nature, enjoy freshly prepared
                  organic meals, and participate in authentic farm activities like milking cows,
                  harvesting vegetables, and making traditional dairy products.
                </p>
                <p className="leading-relaxed text-muted-foreground">
                  Our cozy cottage rooms are designed to provide comfort while keeping you close to
                  nature. Each room features rustic wooden interiors, comfortable bedding, and views
                  of the green fields.
                </p>
              </motion.div>

              <div>
                <h2 className="mb-6 text-2xl font-display font-bold">Room Details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2].map((room) => (
                    <div key={room} className="rounded-2xl border border-border bg-card p-5">
                      <h3 className="mb-3 text-lg font-display font-semibold">Cottage Room {room}</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" /> Up to 3 guests
                        </li>
                        <li className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-primary" /> 1 Extra bed available
                        </li>
                        <li className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-primary" /> Attached Bathroom
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-6 text-2xl font-display font-bold">Amenities & Experiences</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {amenities.map((a) => (
                    <div key={a.label} className="flex items-center gap-3 rounded-xl bg-primary/5 p-4">
                      <a.icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg lg:min-h-[430px]">
                <h3 className="mb-6 text-xl font-display font-bold">Book Your Stay</h3>

                <div className="mb-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Check-in</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start rounded-xl", !checkIn && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkIn ? format(checkIn, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkIn}
                          onSelect={setCheckIn}
                          disabled={(date) => date < new Date()}
                          className="pointer-events-auto p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Check-out</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start rounded-xl", !checkOut && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOut ? format(checkOut, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOut}
                          onSelect={setCheckOut}
                          disabled={(date) =>
                            checkIn ? date <= checkIn : date < new Date()
                          }
                          className="pointer-events-auto p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Number of Guests</label>
                    <select
                      value={guests}
                      onChange={(event) => setGuests(Number(event.target.value))}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {checkIn && checkOut && (
                  <div className="mb-6 space-y-2 rounded-xl bg-muted p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number of Days</span>
                      <span>{numberOfDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Rooms ({pricing.roomsAllocated}) + Extra Beds ({pricing.extraBeds})
                      </span>
                      <span>{"\u20B9"} {pricing.roomPrice.toLocaleString()} / night</span>
                    </div>
                    {pricing.tentGuests > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tent Facility ({pricing.tentGuests} guests)</span>
                        <span>{"\u20B9"} {pricing.tentPrice.toLocaleString()} / night</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accommodation Type</span>
                      <span>{pricing.accommodationType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal / night</span>
                      <span>{"\u20B9"} {pricing.subtotalPerNight.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({pricing.gstRate}%)</span>
                      <span>{"\u20B9"} {pricing.gstAmountPerNight.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-bold">
                      <span>Total / night</span>
                      <span className="text-primary">{"\u20B9"} {pricing.totalPerNight.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({numberOfDays} day{numberOfDays > 1 ? "s" : ""})</span>
                      <span>{"\u20B9"} {subtotalForStay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({numberOfDays} day{numberOfDays > 1 ? "s" : ""})</span>
                      <span>{"\u20B9"} {gstForStay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-bold">
                      <span>Total Booking Price</span>
                      <span className="text-primary">{"\u20B9"} {totalForStay.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {pricing.availabilityMessage ? (
                  <p className="mb-4 text-xs font-medium text-amber-700">{pricing.availabilityMessage}</p>
                ) : null}

                <Button
                  className="h-12 w-full rounded-full text-base"
                  disabled={!checkIn || !checkOut || numberOfDays <= 0}
                  onClick={() =>
                    navigate(
                      `/checkout/stay?checkIn=${format(checkIn as Date, "yyyy-MM-dd")}&checkOut=${format(
                        checkOut as Date,
                        "yyyy-MM-dd"
                      )}&days=${numberOfDays}&guests=${pricing.guests}&rooms=${pricing.roomsAllocated}&extraBeds=${pricing.extraBeds}&tentGuests=${pricing.tentGuests}&accommodationType=${encodeURIComponent(pricing.accommodationType)}&subtotalPerNight=${pricing.subtotalPerNight}&gstRate=${pricing.gstRate}&gstAmountPerNight=${pricing.gstAmountPerNight}&totalPerNight=${pricing.totalPerNight}`
                    )
                  }
                >
                  Book Now
                </Button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Stay;
