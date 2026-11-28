import {
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  HomeIcon,
  InformationCircleIcon,
} from '@heroicons/react/outline'

import { ENABLE_ARCHIVED_GAMES } from '../../constants/settings'
import { GAME_TITLE } from '../../constants/strings'

type Props = {
  onReturnToTitle: () => void
  setIsInfoModalOpen: (value: boolean) => void
  setIsStatsModalOpen: (value: boolean) => void
  setIsDatePickerModalOpen: (value: boolean) => void
  setIsSettingsModalOpen: (value: boolean) => void
}

export const Navbar = ({
  onReturnToTitle,
  setIsInfoModalOpen,
  setIsStatsModalOpen,
  setIsDatePickerModalOpen,
  setIsSettingsModalOpen,
}: Props) => {
  return (
    <div className="navbar">
      <div className="navbar-content grid grid-cols-3 px-5 short:h-auto">
        <div className="flex items-center justify-self-start">
          <button
            type="button"
            aria-label="Return to main home"
            title="Return to main home"
            onClick={onReturnToTitle}
          >
            <HomeIcon className="h-6 w-6 cursor-pointer dark:stroke-white" />
          </button>
          {ENABLE_ARCHIVED_GAMES && (
            <CalendarIcon
              className="ml-3 h-6 w-6 cursor-pointer dark:stroke-white"
              onClick={() => setIsDatePickerModalOpen(true)}
            />
          )}
        </div>
        <div className="relative justify-self-center">
          <p className="text-xl font-bold dark:text-white">{GAME_TITLE}</p>
          <button
            type="button"
            aria-label="Game information"
            title="Game information"
            className="absolute left-full top-1/2 ml-2 -translate-y-1/2"
            onClick={() => setIsInfoModalOpen(true)}
          >
            <InformationCircleIcon className="h-6 w-6 cursor-pointer dark:stroke-white" />
          </button>
        </div>
        <div className="right-icons justify-self-end">
          <ChartBarIcon
            className="mr-3 h-6 w-6 cursor-pointer dark:stroke-white"
            onClick={() => setIsStatsModalOpen(true)}
          />
          <CogIcon
            className="h-6 w-6 cursor-pointer dark:stroke-white"
            onClick={() => setIsSettingsModalOpen(true)}
          />
        </div>
      </div>
      <hr></hr>
    </div>
  )
}
